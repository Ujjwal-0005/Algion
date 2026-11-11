const catalogueService = require('../services/catalogueService');

async function listCategories(req, res, next) {
  try {
    const categories = await catalogueService.listCategories(false);
    return res.status(200).json({ categories });
  } catch (err) {
    next(err);
  }
}

async function listProducts(req, res, next) {
  try {
    const result = await catalogueService.listPublicProducts(req.query);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function getProductBySlug(req, res, next) {
  try {
    const product = await catalogueService.getProductBySlug(req.params.slug);
    return res.status(200).json({ product });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listCategories,
  listProducts,
  getProductBySlug
};

