const Category = require('../models/Category');
const Product = require('../models/Product');
const Variant = require('../models/Variant');
const AppError = require('../errors/AppError');
const auditService = require('./auditService');

function generateSlug(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Category Services
async function listCategories(includeInactive = false) {
  const query = includeInactive ? {} : { isActive: true };
  return Category.find(query).sort({ name: 1 });
}

async function createCategory(data, actor) {
  const slug = data.slug || generateSlug(data.name);
  const existing = await Category.findOne({ $or: [{ name: data.name }, { slug }] });
  if (existing) {
    throw AppError.conflict('Category name or slug already exists');
  }

  const category = await Category.create({
    name: data.name,
    slug,
    isActive: data.isActive !== undefined ? data.isActive : true
  });

  await auditService.createAuditLog({
    actorId: actor.userId,
    actorRole: actor.role,
    action: 'category.create',
    entityType: 'Category',
    entityId: category._id,
    after: category.toJSON()
  });

  return category;
}

async function updateCategory(id, data, actor) {
  const category = await Category.findById(id);
  if (!category) {
    throw AppError.notFound('Category not found');
  }

  const before = category.toJSON();
  if (data.name) category.name = data.name;
  if (data.slug) category.slug = data.slug;
  if (data.isActive !== undefined) category.isActive = data.isActive;

  await category.save();

  await auditService.createAuditLog({
    actorId: actor.userId,
    actorRole: actor.role,
    action: 'category.update',
    entityType: 'Category',
    entityId: category._id,
    before,
    after: category.toJSON()
  });

  return category;
}

async function deleteOrDeactivateCategory(id, actor) {
  const category = await Category.findById(id);
  if (!category) {
    throw AppError.notFound('Category not found');
  }

  // A category referenced by products is deactivated, never deleted.
  const productCount = await Product.countDocuments({ categoryId: id });
  const before = category.toJSON();

  if (productCount > 0) {
    category.isActive = false;
    await category.save();

    await auditService.createAuditLog({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'category.deactivate',
      entityType: 'Category',
      entityId: category._id,
      before,
      after: category.toJSON(),
      reason: 'Referenced by existing products, deactivated instead of deleted'
    });

    return { category, deactivated: true };
  }

  await Category.deleteOne({ _id: id });

  await auditService.createAuditLog({
    actorId: actor.userId,
    actorRole: actor.role,
    action: 'category.delete',
    entityType: 'Category',
    entityId: category._id,
    before,
    after: null
  });

  return { category, deactivated: false };
}

// Product Services
async function listPublicProducts({
  q,
  categorySlug,
  minPrice,
  maxPrice,
  inStock,
  sort = 'newest',
  page = 1,
  limit = 12
}) {
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));

  const productFilter = { isActive: true };

  // Category filter
  if (categorySlug) {
    const category = await Category.findOne({ slug: categorySlug, isActive: true });
    if (!category) {
      return { items: [], page: pageNum, limit: limitNum, total: 0, pages: 0 };
    }
    productFilter.categoryId = category._id;
  }

  // Text search
  if (q && q.trim()) {
    productFilter.$text = { $search: q.trim() };
  }

  // Find candidate products
  let products = await Product.find(productFilter).populate('categoryId', 'name slug').lean();

  if (products.length === 0) {
    return { items: [], page: pageNum, limit: limitNum, total: 0, pages: 0 };
  }

  const productIds = products.map(p => p._id);
  const variants = await Variant.find({
    productId: { $in: productIds },
    isActive: true
  }).lean();

  // Group variants by product
  const variantsByProduct = {};
  variants.forEach(v => {
    const pId = v.productId.toString();
    if (!variantsByProduct[pId]) variantsByProduct[pId] = [];
    variantsByProduct[pId].push(v);
  });

  // Attach variant aggregations and filter
  let enriched = [];
  for (const prod of products) {
    const prodVariants = variantsByProduct[prod._id.toString()] || [];
    if (prodVariants.length === 0) {
      // Must have at least one active variant to appear in public catalogue
      continue;
    }

    const minPriceMinor = Math.min(...prodVariants.map(v => v.priceMinor));
    const maxPriceMinor = Math.max(...prodVariants.map(v => v.priceMinor));
    const hasInStock = prodVariants.some(v => v.stock > 0);
    const totalStock = prodVariants.reduce((sum, v) => sum + v.stock, 0);

    // Apply inStock filter
    if (inStock === 'true' || inStock === true) {
      if (!hasInStock) continue;
    }

    // Apply price filters
    if (minPrice !== undefined && minPrice !== null) {
      const minP = parseInt(minPrice, 10);
      if (minPriceMinor < minP) continue;
    }
    if (maxPrice !== undefined && maxPrice !== null) {
      const maxP = parseInt(maxPrice, 10);
      if (minPriceMinor > maxP) continue;
    }

    enriched.push({
      ...prod,
      minPriceMinor,
      maxPriceMinor,
      inStock: hasInStock,
      totalStock,
      variantsCount: prodVariants.length
    });
  }

  // Sorting
  switch (sort) {
    case 'price_asc':
      enriched.sort((a, b) => a.minPriceMinor - b.minPriceMinor);
      break;
    case 'price_desc':
      enriched.sort((a, b) => b.minPriceMinor - a.minPriceMinor);
      break;
    case 'name_asc':
      enriched.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'newest':
    default:
      enriched.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      break;
  }

  const total = enriched.length;
  const pages = Math.ceil(total / limitNum) || 1;
  const startIndex = (pageNum - 1) * limitNum;
  const items = enriched.slice(startIndex, startIndex + limitNum);

  return {
    items,
    page: pageNum,
    limit: limitNum,
    total,
    pages
  };
}

async function getProductBySlug(slug) {
  const product = await Product.findOne({ slug, isActive: true }).populate('categoryId', 'name slug');
  if (!product) {
    throw AppError.notFound('Product not found');
  }

  const variants = await Variant.find({ productId: product._id, isActive: true }).lean();

  const variantsWithAvailability = variants.map(v => ({
    _id: v._id,
    productId: v.productId,
    sku: v.sku,
    attributes: v.attributes,
    priceMinor: v.priceMinor,
    stock: v.stock,
    inStock: v.stock > 0,
    isActive: v.isActive
  }));

  return {
    ...product.toJSON(),
    variants: variantsWithAvailability
  };
}

// Admin Product Services
async function listAdminProducts({ search, page = 1, limit = 20 }) {
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));

  const filter = {};
  if (search && search.trim()) {
    filter.$or = [
      { name: new RegExp(search.trim(), 'i') },
      { slug: new RegExp(search.trim(), 'i') }
    ];
  }

  const total = await Product.countDocuments(filter);
  const products = await Product.find(filter)
    .populate('categoryId', 'name slug')
    .sort({ createdAt: -1 })
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum)
    .lean();

  const productIds = products.map(p => p._id);
  const variants = await Variant.find({ productId: { $in: productIds } }).lean();

  const variantsByProduct = {};
  variants.forEach(v => {
    const pId = v.productId.toString();
    if (!variantsByProduct[pId]) variantsByProduct[pId] = [];
    variantsByProduct[pId].push(v);
  });

  const items = products.map(p => ({
    ...p,
    variants: variantsByProduct[p._id.toString()] || []
  }));

  return {
    items,
    page: pageNum,
    limit: limitNum,
    total,
    pages: Math.ceil(total / limitNum) || 1
  };
}

async function createProductWithVariants(data, actor) {
  const { name, description, categoryId, imageUrl, isActive, variants } = data;

  const category = await Category.findById(categoryId);
  if (!category) {
    throw AppError.notFound('Category not found');
  }

  const slug = data.slug || generateSlug(name);
  const existing = await Product.findOne({ slug });
  if (existing) {
    throw AppError.conflict('Product with this slug already exists');
  }

  if (!Array.isArray(variants) || variants.length === 0) {
    throw AppError.validation('Every product must have at least one variant');
  }

  const product = await Product.create({
    name,
    slug,
    description,
    categoryId,
    imageUrl: imageUrl || null,
    isActive: isActive !== undefined ? isActive : true
  });

  const createdVariants = [];
  for (const v of variants) {
    const variant = await Variant.create({
      productId: product._id,
      sku: v.sku.toUpperCase(),
      attributes: v.attributes || {},
      priceMinor: v.priceMinor,
      stock: v.stock || 0,
      isActive: v.isActive !== undefined ? v.isActive : true
    });
    createdVariants.push(variant);
  }

  await auditService.createAuditLog({
    actorId: actor.userId,
    actorRole: actor.role,
    action: 'product.create',
    entityType: 'Product',
    entityId: product._id,
    after: { ...product.toJSON(), variants: createdVariants.map(v => v.toJSON()) }
  });

  return { product, variants: createdVariants };
}

async function updateProduct(id, data, actor) {
  const product = await Product.findById(id);
  if (!product) {
    throw AppError.notFound('Product not found');
  }

  const before = product.toJSON();
  if (data.name) product.name = data.name;
  if (data.slug) product.slug = data.slug;
  if (data.description) product.description = data.description;
  if (data.categoryId) {
    const category = await Category.findById(data.categoryId);
    if (!category) throw AppError.notFound('Category not found');
    product.categoryId = data.categoryId;
  }
  if (data.imageUrl !== undefined) product.imageUrl = data.imageUrl;
  if (data.isActive !== undefined) product.isActive = data.isActive;

  await product.save();

  await auditService.createAuditLog({
    actorId: actor.userId,
    actorRole: actor.role,
    action: 'product.update',
    entityType: 'Product',
    entityId: product._id,
    before,
    after: product.toJSON()
  });

  return product;
}

async function deactivateProduct(id, actor) {
  const product = await Product.findById(id);
  if (!product) {
    throw AppError.notFound('Product not found');
  }

  const before = product.toJSON();
  product.isActive = false;
  await product.save();

  await auditService.createAuditLog({
    actorId: actor.userId,
    actorRole: actor.role,
    action: 'product.deactivate',
    entityType: 'Product',
    entityId: product._id,
    before,
    after: product.toJSON()
  });

  return product;
}

async function createVariant(productId, data, actor) {
  const product = await Product.findById(productId);
  if (!product) {
    throw AppError.notFound('Product not found');
  }

  const existing = await Variant.findOne({ sku: data.sku.toUpperCase() });
  if (existing) {
    throw AppError.conflict('Variant with this SKU already exists');
  }

  const variant = await Variant.create({
    productId,
    sku: data.sku.toUpperCase(),
    attributes: data.attributes || {},
    priceMinor: data.priceMinor,
    stock: data.stock || 0,
    isActive: data.isActive !== undefined ? data.isActive : true
  });

  await auditService.createAuditLog({
    actorId: actor.userId,
    actorRole: actor.role,
    action: 'variant.create',
    entityType: 'Variant',
    entityId: variant._id,
    after: variant.toJSON()
  });

  return variant;
}

async function updateVariant(id, data, actor) {
  const variant = await Variant.findById(id);
  if (!variant) {
    throw AppError.notFound('Variant not found');
  }

  const before = variant.toJSON();
  if (data.priceMinor !== undefined) variant.priceMinor = data.priceMinor;
  if (data.isActive !== undefined) variant.isActive = data.isActive;
  if (data.attributes !== undefined) variant.attributes = data.attributes;

  await variant.save();

  await auditService.createAuditLog({
    actorId: actor.userId,
    actorRole: actor.role,
    action: 'variant.update',
    entityType: 'Variant',
    entityId: variant._id,
    before,
    after: variant.toJSON()
  });

  return variant;
}

module.exports = {
  generateSlug,
  listCategories,
  createCategory,
  updateCategory,
  deleteOrDeactivateCategory,
  listPublicProducts,
  getProductBySlug,
  listAdminProducts,
  createProductWithVariants,
  updateProduct,
  deactivateProduct,
  createVariant,
  updateVariant
};

