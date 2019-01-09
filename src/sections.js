'use strict';
const logger = require('./utils/logger');
const uuid = require('uuid');
const PromiseArray = require('promise-subarrays');

module.exports = function(canvas) {
    const sections = {};

    sections.exists = async function(sisSectionId) {
        const res = await canvas.request('GET', `sections/sis_section_id:${sisSectionId}`);
        if(res) {
            return true;
        } else {
            return false;
        }
    };

    sections.add = async function(sisCourseId, sisSectionId, sectionName) {
        const options = {
            'course_section': {
                'name': sectionName,
                'sis_section_id': sisSectionId,
                'enable_sis_reactivation': true
            }
        };
        const res = await canvas.request('POST', `courses/sis_course_id:${sisCourseId}/sections`, options);
        if(res) {
            logger.info(`Successfully added section ${sisSectionId} to course ${sisCourseId}`);
            return res;
        } else {
            logger.info(`Failed to add section ${sisSectionId} to course ${sisCourseId}`);
        }
    };

    sections.get = async function(sisSectionId) {
        return await canvas.request('GET', `sections/sis_section_id:${sisSectionId}?include=students`);
    };

    sections.getAllByTerm = async function(sisTermId) {
        const courses = await canvas.courses.getAllByTerm(sisTermId);
        const sections = [];
        const promiseArray = PromiseArray();

        for(let course of courses) {
            promiseArray.push(async function(course) {
                logger.info(`Getting sections for course ${course.sis_course_id}`);
                const courseSections = await canvas.requestAll(`courses/${course.id}/sections`); // include[]=enrollments results in a 504 on large courses.  Work around below.
                for(let courseSection of courseSections) {
                    // Now pull down just the section but include the students and enrollments
                    courseSection = await canvas.request('GET', `courses/${course.id}/sections/${courseSection.id}?include[]=students&include[]=enrollments`);
                    courseSection.account_id = course.account_id;
                    courseSection.workflow_state = course.workflow_state;

                    sections.push(courseSection);
                }
            }, [course]);
        }

        await promiseArray.awaitAll(canvas.maxSimultaneousRequests);
        return sections;
    };

    sections.enrollUser = async function(sisSectionId, sisUserId, enrollmentType, limitPriviledges) {
        const options = {
            'enrollment': {
                'user_id': `sis_user_id:${sisUserId}`,
                'type': enrollmentType,
                'enrollment_state': 'active',
                'limit_privileges_to_course_section': limitPriviledges
            }
        };
        logger.debug(`enroll user options = ${JSON.stringify(options)}`);
        const res = await canvas.request('POST', `sections/sis_section_id:${sisSectionId}/enrollments`, options);
        if(res) {
            logger.info(`Successfully enrolled user with sisUserId = ${sisUserId} in section with sisSectionId = ${sisSectionId}`);
            return res;
        } else {
            logger.error(`Failed to enroll user with sisUserId = ${sisUserId} in section with sisSectionId = ${sisSectionId}`);
        }
    };

    sections.isEnrolled = async function(sisSectionId, sisUserId) {
        const enrollment = await sections.getEnrollment(sisSectionId, sisUserId);
        if(enrollment) {
            return true;
        } else {
            return false;
        }
    };

    sections.getEnrollment = async function(sisSectionId, sisUserId, type) {
        if(!sisSectionId) {
            logger.error("Must provide sisSectionId to sections.getEnrollment");
        }
        let url = `users/sis_user_id:${sisUserId}/enrollments?sis_section_id=${sisSectionId}&state[]=active&state[]=invited&state[]=inactive&state[]=completed`;
        if(type) {
            url = `${url}&type[]=${type}`;
        }
        const res = await canvas.request('GET', url.toString());
        if(res) {
            if(res.length > 1) {
                logger.error('Too many enrollments returned in sections.getEnrollment');
                return false;
            } else {
                return res[0];
            }
        } else {
            return false;
        }
    };

    sections.changeEnrollment = async function(sisSectionId, sisUserId, task, type) {
        const enrollment = await sections.getEnrollment(sisSectionId, sisUserId, type);
        if(enrollment) {
            const options = {
                task: task
            };
            const res = await canvas.request('DELETE', `courses/${enrollment.course_id}/enrollments/${enrollment.id}`, options);
            if(res) {
                logger.info(`Successfully applied task = ${task} to the enrollment of user with sisUserId = ${sisUserId} to section with sisSectionId = ${sisSectionId}`);
                return true;
            } else {
                logger.error(`Failed to apply task = ${task} to the enrollment of user with sisUserId = ${sisUserId} to section with sisSectionId = ${sisSectionId}`);
                return false;
            }
        } else {
            const msg = `Enrollment not found while trying to apply task = ${task} to the enrollment of user with sisUserId = ${sisUserId} to section with sisSectionId = ${sisSectionId}`;
            if(task === "delete") {
                logger.info(msg);
                return true;
            } else {
                logger.error(msg);
                return false;
            }
        }
    };

    sections.getAllEnrollments = async function(sisSectionId) {
        return await canvas.requestAll(`sections/sis_section_id:${sisSectionId}/enrollments`);
    };



    sections.updName = async function(sisSectionId,name)
    {
      const options = { course_section: { name:name } };
      const res = await canvas.request('PUT', `sections/sis_section_id:${sisSectionId}`, options);
      if(res)
      {
        logger.info(`Successfully updated section name to ${name} for ${sisSectionId}`);
      }
      else
      {
        logger.error(`Failed to update section name to ${name} for ${sisSectionId}`);
      }
    };



    sections.delete = async function(sisSectionId) {
        // Delete all enrollments prior to deleting section
        const enrollments = await sections.getAllEnrollments(sisSectionId);
        const promiseArray = PromiseArray();
        for(let enrollment of enrollments) {
            promiseArray.push(sections.changeEnrollment, [sisSectionId, enrollment.sis_user_id, "delete", enrollment.type]);
        }

        await promiseArray.awaitAll(canvas.maxSimultaneousRequests);

        const newId = uuid();
        const options = {
            course_section: {
                sis_section_id: newId
            }
        };
        let res;
        res = await canvas.request('PUT', `sections/sis_section_id:${sisSectionId}`, options);
        if(!res) {
            logger.error(`Failed to scramble sisSectionId prior to deleting account with sisSectionId = ${sisSectionId}`);
        } else {
            res = await canvas.request('DELETE', `sections/${res.id}`);
            if(res) {
                logger.info(`Successfully deleted section with sisSectionId = ${sisSectionId}`);
            } else {
                logger.error(`Failed to delete section with sisSectionId = ${sisSectionId}`);
            }
        }
    };

    return sections;
};
