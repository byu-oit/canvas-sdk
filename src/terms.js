'use strict';
const logger = require('./utils/logger');
const uuid = require('uuid');
const DATE_FORMAT_STRING = 'YYYY-MM-DDTHH:MM:SSZ';

module.exports = function(canvas) {
    const terms = {};

    terms.exists = async function(sisTermId) {
        const terms = await canvas.request('GET', `accounts/1/terms?page=1&per_page=100`);
        if(terms) {
            for(const term of terms.enrollment_terms) {
                if(term.sis_term_id === sisTermId) {
                    logger.info(`Term ${sisTermId} already exists in Canvas.`);
                    return true;
                }
            }
            return false;
        }
    };

    terms.add = async function(termName, termStartDate, termEndDate, termId, termGradesDueDate) {
        const options = {
            'enrollment_term': {
                'name': termName,
                'start_at': termStartDate.toString(DATE_FORMAT_STRING),
                'end_at': termEndDate.toString(DATE_FORMAT_STRING),
                'sis_term_id': termId,
                'overrides': {
                    'TeacherEnrollment': {
                        "start_at": null,
                        "end_at": termGradesDueDate.toString(DATE_FORMAT_STRING)
                    },
                    'TaEnrollment': {
                        "start_at": null,
                        "end_at": termGradesDueDate.toString(DATE_FORMAT_STRING)
                    }
                }
            }
        };
        logger.debug(`Request options for add term: ${JSON.stringify(options)}`);
        const res = await canvas.request('POST', 'accounts/1/terms', options);
        if(res) {
            logger.info(`Term with id ${termId} was created successfully`);
            return res;
        } else {
            logger.error(`Term with id ${termId} failed to be added!`);
        }
    };

    terms.delete = async function(sisTermId) {
        const newId = uuid();
        const options = {
            enrollment_term: {
                sis_term_id: newId
            }
        };
        let res;
        res = await canvas.request('PUT', `accounts/1/terms/sis_term_id:${sisTermId}`, options);
        if(!res) {
            logger.error(`Failed to scramble sisTermId prior to deleting term with sisTermId = ${sisTermId}`);
        } else {
            res = await canvas.request('DELETE', `accounts/1/terms/sis_term_id:${newId}`);
            if(res) {
                logger.info(`Successfully deleted term with sisTermId = ${sisTermId}`);
            } else {
                logger.error(`Failed to delete term with sisTermId = ${sisTermId}`);
            }
        }
    };

    terms.get = async function(sisTermId) {
        const terms = await canvas.terms.getAll();
        for(let term of terms) {
            if(term.sis_term_id === sisTermId) {
                return term;
            }
        }
    };

    terms.getAll = async function() {
        return await canvas.requestAll('accounts/1/terms?include[]=overrides', 'enrollment_terms');
    };

    return terms;
};
