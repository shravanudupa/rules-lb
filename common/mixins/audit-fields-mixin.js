/**
 *
 * 2018-2019 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

// Author : Atul
const logger = require('oe-logger');
const log = logger('audit-field-mixin');
const loopback = require('loopback');
log.info('audit-field-mixin Loaded');

module.exports = function AuditFieldsMixin(Model) {
  if (Model.definition.name === 'BaseEntity') {
    var accessTokenModel = loopback.getModelByType('AccessToken');
    accessTokenModel.defineProperty('username', {
      type: String,
      length: 200
    });
    accessTokenModel.defineProperty('email', {
      type: String,
      length: 200
    });
    accessTokenModel.observe('before save', function (ctx, next) {
      if (!ctx.isNewInstance) {
        log.warn(log.defaultContext(), 'Hook exececutes only for new instance of AccessToken');
        return next();
      }
      var instance = ctx.instance;
      if (!instance) {
        log.warn(log.defaultContext(), 'No instance found');
        return next();
      }
      if (!instance.userId) {
        log.warn(log.defaultContext(), 'No instance found - user id not defined');
        return next();
      }

      var userModel = loopback.getModelByType('User');
      userModel.findOne({ where: {id: instance.userId }}, ctx.options, function (err, result) {
        if (err) {
          return next(err);
        }
        if (!result) {
          return next(new Error('User Data not found for user Id ', instance.userId));
        }
        instance.username = result.username;
        instance.email = result.email;
        return next();
      });
    });
    return;
  }

  Model.defineProperty('_type', {
    type: String,
    length: 200
  });
  Model.defineProperty('_createdBy', {
    type: String,
    length: 200
  });
  Model.defineProperty('_modifiedBy', {
    type: String,
    length: 200
  });

  Model.defineProperty('_createdOn', {
    type: 'date'
  });

  Model.defineProperty('_modifiedOn', {
    type: 'date'
  });
  log.debug(log.defaultContext(), 'Attach audit-field-mixin to ', Model.definition.name);

  if ((Model.settings.overridingMixins && !Model.settings.overridingMixins.AuditFieldsMixin) || !Model.settings.mixins.AuditFieldsMixin) {
    Model.observe('before save', injectAuditFields);
  } else {
    Model.observe('before save', injectAuditFields);
  }
};

/**
 * This is an before save observer hook to auto inject Audit properties to the
 * Posted data.<br><br>
 *
 * It checks if posted data is a new instance or an update. In case of new
 * Instance it populates all the audit fields, where as in case of update it
 * modifies _modifiedBy and _modifiedOn with the appropriate user and time stamp respectively.
 *
 * @param {object} ctx - ctx object, which is populated by DAO.
 * @param {function} next - move to the next function in the queue
 * @return {function} next - move to the next function in the queue
 * @memberof Audit Mixin
 */
function injectAuditFields(ctx, next) {
  var context = ctx.options;
  var cctx = context.ctx || {};

  var remoteUser = cctx.remoteUser;
  if (!remoteUser && (ctx.options && ctx.options.accessToken && ctx.options.accessToken.username)) {
    remoteUser = ctx.options.accessToken.username;
  }
  remoteUser = remoteUser || 'system';
  var currentDateTime = new Date();

  var protectedFields = ['_type', '_createdBy', '_modifiedBy', '_createdOn', '_modifiedOn'];
  var postData = ctx.instance || ctx.data;
  // var currentInstance = ctx.currentInstance;
  // if user provide data for any protectedField those data are removed, and
  // auto set.
  var isInstance = ctx.instance;
  protectedFields.forEach(function AuditFieldsMixinProtectedFieldsForEachCb(field) {
    if (isInstance) {
      postData.unsetAttribute(field);
    } else {
      delete postData[field];
    }
  });
  if (isInstance) {
    // full save.
    if (ctx.isNewInstance) {
      // Auto-populate entity type
      postData._type = ctx.Model.definition.name;

      // Auto-populate created by user id and timestamp
      postData._createdBy = remoteUser;
      postData._createdOn = currentDateTime;
    }
  }
  //console.log('currentDateTime',currentDateTime)
  postData._modifiedBy = remoteUser;
  postData._modifiedOn = currentDateTime;
  return next();
}
