/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
/**
 * This mixin is to support version control of a record/instance it adds a new
 * property called _version and auto populate it with uuidv4() which is a
 * unique number, new version for a record is generated, when a new instance is
 * created or updated.<br><br>
 * It also changes signaure of deleteById Remote call to include version id
 *
 * @mixin EV Version Mixin
 * @author Sivankar Jain/Atul Pandit
 */

const uuidv4 = require('uuid/v4');
const oecloudutil = require('../../lib/oeutil');
const isMixinEnabled = require('../../lib/utils').isMixinEnabled;

module.exports = function VersionMixin(Model) {
  if (Model.modelName === 'BaseEntity') {
    return;
  }

  Model.defineProperty('_oldVersion', {
    type: String
  });

  // Atul : in oeCloud.io 1.x - _version was unique index
  Model.defineProperty('_version', {
    type: String,
    index: true,
    required: true
  });

  Model.defineProperty('_requestId', {
    type: String
  });

  Model.defineProperty('_newVersion', {
    type: String
  });

  Model.defineProperty('_parentVersion', {
    type: String
  });


  // Model.settings._versioning = true;
  // Model.settings.updateOnLoad = true;

  Model.evObserve('after save', function afterSaveVersionMixin(ctx, next) {
    var data = ctx.data || ctx.instance;
    if (data && data.__data) {
      delete data.__data._newVersion;
    }
    next();
  });

  // lock current _version
  Model.evObserve('persist', function versionMixinPersistsFn(ctx, next) {
    delete ctx.data._newVersion;
    return next();
  });

  if (Model.sharedClass && Model.sharedClass.findMethodByName && Model.sharedClass.findMethodByName('deleteById')) {
    Model.remoteMethod('deleteWithVersion', {
      http: {
        path: '/:id/:version',
        verb: 'delete'
      },
      description: 'Delete a model instance by id and version number, from the data source.',
      accepts: [{
        arg: 'id',
        type: 'string',
        required: true,
        http: {
          source: 'path'
        }
      }, {
        arg: 'version',
        type: 'string',
        required: true,
        http: {
          source: 'path'
        }
      },
      {
        arg: 'options', type: 'object', http: 'optionsFromRequest'
      }],
      returns: {
        arg: 'response',
        type: 'object',
        root: true
      }
    });
  }

  if (Model.sharedClass && Model.sharedClass.findMethodByName) {
    var remoteMethodOld = Model.sharedClass.findMethodByName('deleteById');
    var remoteMethodNew = Model.sharedClass.findMethodByName('deleteWithVersion');
    if (remoteMethodNew && remoteMethodOld) {
      remoteMethodOld.accepts = remoteMethodNew.accepts;
      remoteMethodOld.http = remoteMethodNew.http;
    }
  }


  Model.evObserve('before save', function (ctx, next) {
    var data = ctx.data || ctx.instance;
    if (ctx.currentInstance && ctx.data && ctx.data._isDeleted) {
      data._version = ctx.currentInstance._version;
      return next();
    }
    if (ctx.isNewInstance) {
      data._version = data._newVersion || data._version || uuidv4();
      delete data._oldVersion;
      delete data._newVersion;
    }
    if (ctx.Model.relations) {
      var relations = ctx.Model.relations;
      for (var r in ctx.Model.relations) {
        if (relations[r].type !== 'embedsOne' &&  relations[r].type !== 'embedsMany') {
          continue;
        }
        var keyFrom = relations[r].keyFrom;
        if (!data._version && !ctx.isNewInstance && data[keyFrom] && typeof data[keyFrom] === 'object') {
          if (Array.isArray(data[keyFrom]) && data[keyFrom].length > 0 ) {
            // Atul : For embeds many, it will be array
            data._version = data[keyFrom][0]._parentVersion  || data[keyFrom][0]._version;
          } else {
            data._version = data[keyFrom]._parentVersion || data[keyFrom]._version;
          }
          break;
        } else if (ctx.isNewInstance && isMixinEnabled(relations[r].modelTo, 'VersionMixin')) {
          if (relations[r].type === 'embedsOne' && data[keyFrom]) {
            data[keyFrom]._version = data._version;
          } else if (relations[r].type === 'embedsMany' && Array.isArray(data[keyFrom]) && data[keyFrom].length) {
            data[keyFrom].forEach(function (item) {
              item._version = data._version;
            });
          }
        }
      }
    }
    if (ctx.isNewInstance) {
      return next();
    }

    var error;
    var id = oecloudutil.getIdValue(ctx.Model, data);
    var _version = data._version;

    if (!data._version) {
      error = new Error();
      Object.assign(error, { name: 'Data Error', message: 'Version must be defined. id ' + id + ' for model ' + Model.modelName, code: 'DATA_ERROR_071', type: 'DataModifiedError', retriable: false, status: 422 });
      return next(error);
    }
    if (ctx.currentInstance) {
      if (ctx.currentInstance._version !== data._version) {
        error = new Error();
        Object.assign(error, { name: 'Data Error', message: 'Version must be be same. id ' + id + ' for model ' + Model.modelName + ' Version ' + _version + ' <> ' + ctx.currentInstance._version, code: 'DATA_ERROR_071', type: 'DataModifiedError', retriable: false, status: 422 });
        return next(error);
      }
    }
    return next();
  });
};
