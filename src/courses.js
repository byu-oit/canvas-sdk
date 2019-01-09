'use strict';
const logger = require('./utils/logger');
const uuid = require('uuid');

module.exports = function(canvas) {
    const courses = {};

    courses.exists = async function(sisCourseId) {
        const res = await canvas.request('GET', `courses/sis_course_id:${sisCourseId}`);
        if(res) {
            return true;
        } else {
            return false;
        }
    };

    courses.add = async function(courseName, courseCode, sisTermId, sisCourseId, accountId, gradingStandardId) {
        const options = {
            'course': {
                'name': courseName,
                'course_code': courseCode,
                'term_id': `sis_term_id:${sisTermId}`,
                'sis_course_id': sisCourseId,
                'account_id': accountId,
                'grading_standard_id': gradingStandardId
            }
        };
        logger.debug(`canvas.course.add options: ${JSON.stringify(options)}`);
        const res = await canvas.request('POST', `accounts/${accountId}/courses`, options);
        if(res) {
            logger.info(`Course creation succeeded for ${courseName} with sisId = ${sisCourseId}`);
            return res;
        } else {
            logger.error(`Course creation failed for ${courseName} with sisId = ${sisCourseId}`);
        }
    };

    courses.get = async function(sisCourseId) {
        return await canvas.request('GET', `courses/sis_course_id:${sisCourseId}`);
    };

    courses.getAll = async function() {
        return await canvas.requestAll('accounts/1/courses');
    };

    courses.getAllByTerm = async function(sisTermId) {
        return await canvas.requestAll(`accounts/1/courses?recursive=true&enrollment_term_id=sis_term_id:${sisTermId}`);
    };

    courses.updateAccount = async function(sisCourseId, accountId) {
        const options = {
            course: {
                account_id: accountId
            }
        };
        const res = await canvas.request('PUT', `courses/sis_course_id:${sisCourseId}`, options);
        if(res) {
            logger.info(`Successfully updated accountId to ${accountId} for ${sisCourseId}`);
        } else {
            logger.error(`Failed to update accountId to ${accountId} for ${sisCourseId}`);
        }
    };



    courses.updName = async function(sisCourseId,name)
    {
      const options = { course: { name:name } };
      const res = await canvas.request('PUT', `courses/sis_course_id:${sisCourseId}`, options);
      if(res)
      {
        logger.info(`Successfully updated course name to ${name} for ${sisCourseId}`);
      }
      else
      {
        logger.error(`Failed to update course name to ${name} for ${sisCourseId}`);
      }
    };



    courses.delete = async function(sisCourseId) {
        const newId = uuid();
        const options = {
            course: {
                sis_course_id: newId
            }
        };
        let res;
        res = await canvas.request('PUT', `courses/sis_course_id:${sisCourseId}`, options);
        if(!res) {
            logger.error(`Failed to scramble sisCourseId prior to deleting account with sisCourseId = ${sisCourseId}`);
        } else {
            res = await canvas.request('DELETE', `courses/${res.id}?event=delete`);
            if(res) {
                logger.info(`Successfully deleted course with sisCourseId = ${sisCourseId}`);
            } else {
                logger.error(`Failed to delete course with sisCourseId = ${sisCourseId}`);
            }
        }
    };

    return courses;
};
