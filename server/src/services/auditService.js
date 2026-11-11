const AuditLog = require('../models/AuditLog');

async function createAuditLog({
  actorId = null,
  actorRole = 'system',
  action,
  entityType,
  entityId,
  before = null,
  after = null,
  reason = null,
  session = null
}) {
  const [log] = await AuditLog.create([{
    actorId,
    actorRole,
    action,
    entityType,
    entityId,
    before,
    after,
    reason
  }], { session });

  return log;
}

module.exports = {
  createAuditLog
};

