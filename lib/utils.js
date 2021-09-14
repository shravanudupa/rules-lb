﻿/**
 *
 * ©2018-2019 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
/**
 * This is file contains utility function to check if version of record being updated
 * is matching in database. It directly queries database if for given Id and version, record exists
 *
 * @mixin EV Version Mixin
 * @author : Atul Pandit
 */

// Author : Atul
const log = require('oe-logger')('oe-common-mixins-utils');
const oeutils = require('./oeutil');
const loopback = require('loopback');
module.exports.checkIfVersionMatched = function checkIfVersionMatched(Model, id, version, next) {
  if (!version) {
    var error = new Error();
    Object.assign(error, { name: 'Data Error', message: 'Version must be defined. id ' + id + ' for model ' + Model.modelName, code: 'DATA_ERROR_071', type: 'DataModifiedError', retriable: false, status: 422 });
    return next(error);
  }
  var numId = false;
  if (typeof id === 'string') {
    if (!isNaN(id)) {
      numId = parseInt(id, 10);
    }
  }
  var idField = oeutils.idName(Model);
  var where = {};
  var idFieldClause = {};
  idFieldClause[idField] = id;

  if (numId) {
    var temp = {};
    temp[idField] = numId;
    idFieldClause = { or: [temp, idFieldClause] };
  }
  where = { where: { and: [idFieldClause, { _version: version }] } };
  Model.find(where, { notify: false }, function (err, result) {
    if (err) {
      log.error(log.defaultContext(), 'Error finding model record with id and version', Model.modelName, id, version);
      return next(err);
    }
    if (result.length !== 1) {
      var error = new Error();
      Object.assign(error, { name: 'Data Error', message: 'Version must be defined. version : ' + version + ' id ' + id + ' for model ' + Model.modelName, code: 'DATA_ERROR_071', type: 'DataModifiedError', retriable: false, status: 422 });
      return next(error);
    }
    return next(undefined, result[0]);
  });
};

module.exports.isMixinEnabled = function isMixinEnabled(model, mixin) {
  var Model;

  if (typeof model === 'string') {
    Model = loopback.findModel(model);
  } else {
    Model = model;
  }
  if (!Model.settings || !Model.settings.mixins) {
    return false;
  }
  var flag = Model.settings.mixins[mixin];
  if (!flag) {
    return false;
  }
  if (flag) {
    if (Model.settings.overridingMixins && !Model.settings.overridingMixins[mixin]) {
      return false;
    }
  }
  return flag;
};


