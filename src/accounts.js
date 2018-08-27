'use strict';
const logger = require('./utils/logger');
const uuid = require('uuid');

module.exports = function(canvas) {
    const accounts = {};

    accounts.exists = async function(sisAccountId) {
        return await canvas.request('GET', `accounts/sis_account_id:${sisAccountId}`);
    };

    accounts.add = async function(accountName, sisAccountId, parentAccountId) {
        if(!sisAccountId || !parentAccountId) {
            if(!sisAccountId) {
                logger.error(`sisAccountId cannot be null!`);
            }
            if(!parentAccountId) {
                logger.error(`parentAccountId cannot be null!`);
            }
        } else {
            logger.debug(`Trying to add a new account with parentAccountId: ${parentAccountId} and sisAccountId: ${sisAccountId}`);
            const options = {
                account: {
                    name: accountName,
                    sis_account_id: sisAccountId
                }
            };
            logger.debug(`canvas.accounts.add options: ${JSON.stringify(options)}`);
            const res = await canvas.request('POST', `accounts/${parentAccountId}/sub_accounts`, options);
            if(res) {
                logger.debug(`Account created successfully.`);
                return res;
            } else {
                logger.error(`Account creation failed`);
            }
        }
    };

    accounts.get = async function(sisAccountId) {
        return await canvas.request('GET', `accounts/sis_account_id:${sisAccountId}`);
    };

    accounts.getAdmins = async function(accountId = 1) {
        return await canvas.requestAll(`accounts/${accountId}/admins`);
    };

    accounts.isAdmin = async function(sisUserId) {
        const admins = await accounts.getAdmins();
        for(let admin of admins) {
            if(admin.user.sis_user_id === sisUserId) {
                return true;
            }
        }
        return false;
    };

    accounts.delete = async function(sisAccountId) {
        const newId = uuid();
        const options = {
            account: {
                sis_account_id: newId
            }
        };
        let res;
        res = await canvas.request('PUT', `accounts/sis_account_id:${sisAccountId}`, options);
        if(!res) {
            logger.error(`Failed to scramble sisAccountId prior to deleting account with sisAccountId = ${sisAccountId}`);
        } else {
            res = await canvas.request('DELETE', `accounts/1/sub_accounts/${res.id}`);
            if(res) {
                logger.info(`Successfully deleted account with sisAccountId = ${sisAccountId}`);
            } else {
                logger.error(`Failed to delete account with sisAccountId = ${sisAccountId}`);
            }
        }
    };

    return accounts;
};