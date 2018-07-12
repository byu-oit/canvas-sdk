'use strict';
const logger = require('./utils/logger');
const uuid = require('uuid');

module.exports = function(canvas) {
    const users = {};

    users.exists = async function(sisUserId) {
        const res = await canvas.request('GET', `users/sis_user_id:${sisUserId}`);
        if(res) {
            return true;
        } else {
            return false;
        }
    };

    users.isAdmin = async function(sisUserId) {
        const admins = await canvas.account.getAdmins();
        if(admins) {
            for(let admin of admins) {
                if(admin.user.sis_user_id === sisUserId) {
                    return true;
                }
            }
            return false;
        } else {
            return false;
        }
    };

    users.get = async function(sisUserId) {
        return await canvas.request('GET', `users/sis_user_id:${sisUserId}`);
    };

    users.getById = async function(userId) {
        return await canvas.request('GET', `users/${userId}`);
    };

    users.add = async function(name, sortableName, email, sisUserId, loginId) {
        const options = {
            'user': {
                'name': name,
                'short_name': name,
                'sortable_name': sortableName,
                'email': email,
                'time_zone': 'Mountain Time (US & Canada)',
                'skip_registration': true
            },
            'pseudonym': {
                'sis_user_id': sisUserId,
                'unique_id': loginId,
                'send_confirmation': false
            },
            'communication_channel': {
                'type': 'email',
                'address': email,
                'skip_confirmation': true
            },
            'enable_sis_reactivation': 'true'
        };
        logger.debug(`user.add options = ${JSON.stringify(options)}`);
        let res = await canvas.request('POST', 'accounts/1/users', options);
        if(res) {
            logger.info(`Successfully added an account for user with sisUserId = ${sisUserId}`);
            return res;
        } else {
            logger.warn(`Failed to add an account for user with sisUserId = ${sisUserId}. Checking for user with the same loginId`);
            res = await users.setSisIdByLoginId(loginId, sisUserId);
            return res;
        }
    };

    users.setSisId = async function(userId, sisUserId) {
        const logins = await canvas.request('GET', `users/${userId}/logins`);
        if(logins.length > 1) {
            logger.error('Unable to set sis_user_id because the user has multiple logins');
        } else if(logins.length === 0) {
            logger.error('Unable to set sis_user_id because the user doesn\'t have any logins');
        } else {
            logger.debug(`User login: ${JSON.stringify(logins[0])}`);
            const options = {
                'login[sis_user_id]': sisUserId
            };
            const res = await canvas.request('PUT', `accounts/1/logins/${logins[0].id}`, options, true);
            if(res) {
                logger.info(`Successfully set sisUserId to ${sisUserId}`);
            } else {
                logger.error(`Failed to set sisUserId to ${sisUserId}`);
            }
        }
    };

    users.setSisIdByLoginId = async function(loginId, sisUserId) {
        const users = await canvas.request('GET', `accounts/1/users?search_term=${loginId}`);
        let user;
        if(users) {
            for(let tmpUser of users) {
                if(tmpUser.login_id === loginId) {
                    user = tmpUser;
                }
            }
        }
        if(!users || !user) {
            logger.error('Unable to set sis_user_id by login_id because user was not found');
        } else {
            await canvas.users.setSisId(user.id, sisUserId);
            return user;
        }
    };

    users.addObservee = async function(observerSisUserId, observeeSisUserId) {
        const res = await canvas.request('PUT', `users/sis_user_id:${observerSisUserId}/observees/sis_user_id:${observeeSisUserId}`);
        if(res) {
            logger.info(`Successfully added ${observerSisUserId} as an observer of ${observeeSisUserId}`);
            return res;
        } else {
            logger.error(`Failed to add ${observerSisUserId} as an observer of ${observeeSisUserId}`);
        }
    };

    users.deleteObservee = async function(observerSisUserId, observeeSisUserId) {
        const res = await canvas.request('DELETE', `users/sis_user_id:${observerSisUserId}/observees/sis_user_id:${observeeSisUserId}`);
        if(res) {
            logger.info(`Successfully deleted ${observerSisUserId} as an observer of ${observeeSisUserId}`);
        } else {
            logger.error(`Failed to delete ${observerSisUserId} as an observer of ${observeeSisUserId}`);
        }
    };

    users.listObservees = async function(observerSisUserId) {
        const observees = await canvas.request('GET', `users/sis_user_id:${observerSisUserId}/observees`);
        let result = [];
        for(let observee of observees) {
            let user = await canvas.users.getById(observee.id);
            result.push(user);
        }
        return result;
    };

    users.deleteAllObservees = async function(observerSisUserId) {
        const observees = await canvas.users.listObservees(observerSisUserId);
        for(let observee of observees) {
            await canvas.users.deleteObservee(observerSisUserId, observee.sis_user_id);
        }
    };

    return users;
};