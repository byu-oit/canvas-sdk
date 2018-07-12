'use strict';
const canvas = require('./index')({
    // tokens: [
    //     process.env.TOKEN,
    //     process.env.TOKEN2
    // ],
    token: process.env.TOKEN,
    subdomain: process.env.SUBDOMAIN
});
const logger = require('./src/utils/logger');
const assert = require('assert').strict;
const uuid = require('uuid');

const ROOT_ACCOUNT_ID = 1;

const SIS_ACCOUNT_ID = 'canvas-sdk-test-account';
const ACCOUNT_NAME = 'canvas-SDK Test Account';

const SIS_TERM_ID = 'canvas-sdk-test-term';
const TERM_NAME = 'Canvas-SDK Test Term';
const TERM_LENGTH = 14 * 24 * 60 * 60 * 1000; // 14 days
const TERM_START_DATE = new Date();
const TERM_END_DATE = new Date(new Date().getTime() + TERM_LENGTH);

const SIS_COURSE_ID = 'canvas-sdk-test-course';
const COURSE_NAME = 'Canvas-SDK Test Course';
const COURSE_CODE = 'Canvas-SDK';

const SIS_SECTION_ID = 'canvas-sdk-test-section';
const SECTION_NAME = 'Canvas-SDK Test Section';

const SIS_USER_ID = 'canvas-sdk-test-user';
const SIS_USER_ID2 = SIS_USER_ID + '2';
const NEW_SIS_USER_ID = 'canvas-sdk-test-user-new-id';
const USER_NAME = 'Canvas-SDK Test User';
const USER_EMAIL = 'canvas-sdk@example.com';
const USER_LOGIN_ID = 'canvas-sdk';

main();

async function main() {
    console.log(`****************** Running tests against ${canvas.baseurl} ******************`);
    console.log('To see all logs, run with LOG_LEVEL=debug');

    /****************** Setup ******************/
    const account = await canvas.accounts.add(ACCOUNT_NAME, SIS_ACCOUNT_ID, ROOT_ACCOUNT_ID);
    const term = await canvas.terms.add(TERM_NAME, TERM_START_DATE, TERM_END_DATE, SIS_TERM_ID, TERM_END_DATE);
    const course = await canvas.courses.add(COURSE_NAME, COURSE_CODE, SIS_TERM_ID, SIS_COURSE_ID, account.id);
    const section = await canvas.sections.add(SIS_COURSE_ID, SIS_SECTION_ID, SECTION_NAME);
    const user = await canvas.users.add(USER_NAME, USER_NAME, USER_EMAIL, SIS_USER_ID, USER_LOGIN_ID);
    const user2 = await canvas.users.add(USER_NAME, USER_NAME, USER_EMAIL, SIS_USER_ID2, USER_LOGIN_ID + '2');
    /****************** End Setup ******************/
    try {
        // Accounts
        assert.ok(await canvas.accounts.exists(SIS_ACCOUNT_ID));
        assert.ok(! await canvas.accounts.exists(uuid()));
        assert.deepEqual(account, await canvas.accounts.get(SIS_ACCOUNT_ID));
        assert.equal(account.name, ACCOUNT_NAME);
        assert.equal(account.sis_account_id, SIS_ACCOUNT_ID);
        assert.equal(account.parent_account_id, ROOT_ACCOUNT_ID); // FIXME: Try with another account
        assert.equal(account.root_account_id, ROOT_ACCOUNT_ID);
        //FIXME: Test canvas.accounts.getAdmins

        // Terms
        assert.ok(await canvas.terms.exists(SIS_TERM_ID));
        assert.ok(! await canvas.terms.exists(uuid()));
        assert.deepEqual(term, await canvas.terms.get(SIS_TERM_ID));
        assert.equal(term.name, TERM_NAME);
        assert.equal(term.sis_term_id, SIS_TERM_ID);
        assert.equal(term.start_at, TERM_START_DATE.toISOString().replace(/[.]\d{3}[Z]$/, 'Z'));
        assert.equal(term.end_at, TERM_END_DATE.toISOString().replace(/[.]\d{3}[Z]$/, 'Z'));
        assert.deepEqual(term.overrides, {
            TeacherEnrollment: {
                start_at: null,
                end_at: TERM_END_DATE.toISOString().replace(/[.]\d{3}[Z]$/, 'Z')
            },
            TaEnrollment: {
                start_at: null,
                end_at: TERM_END_DATE.toISOString().replace(/[.]\d{3}[Z]$/, 'Z')
            }
        });
        const terms = await canvas.terms.getAll();
        assert.ok(terms.length > 1);

        // Courses
        assert.ok(await canvas.courses.exists(SIS_COURSE_ID));
        assert.ok(! await canvas.courses.exists(uuid()));
        assert.ok(await canvas.courses.get(SIS_COURSE_ID));
        assert.equal(course.name, COURSE_NAME);
        assert.equal(course.course_code, COURSE_CODE);
        assert.equal(course.enrollment_term_id, term.id);
        assert.equal(course.sis_course_id, SIS_COURSE_ID);
        assert.equal(course.account_id, account.id);
        assert.equal(course.grading_standard_id, 10); // The BYU A-E Grading Standard
        const courses = await canvas.courses.getAllByTerm(SIS_TERM_ID);
        courses[0].enrollments = [];
        assert.deepEqual(courses, [await canvas.courses.get(SIS_COURSE_ID)]);
        await canvas.courses.updateAccount(SIS_COURSE_ID, 1);
        assert.equal((await canvas.courses.get(SIS_COURSE_ID)).account_id, 1);

        // Sections
        assert.ok(await canvas.sections.exists(SIS_SECTION_ID));
        assert.ok(! await canvas.sections.exists(uuid()));
        let sections = await canvas.sections.getAllByTerm(SIS_TERM_ID);
        assert.equal(sections.length, 1);
        assert.equal(sections[0].sis_section_id, SIS_SECTION_ID);

        // Enrollments
        assert.ok(await canvas.sections.enrollUser(SIS_SECTION_ID, SIS_USER_ID, 'StudentEnrollment', true));
        sections = await canvas.sections.getAllByTerm(SIS_TERM_ID);
        assert.equal(sections[0].students.length, 1);
        assert.equal((sections[0].students[0].sis_user_id), SIS_USER_ID);
        let enrollment = await canvas.sections.getEnrollment(SIS_SECTION_ID, SIS_USER_ID);
        assert.equal(enrollment.sis_user_id, SIS_USER_ID);
        await canvas.sections.changeEnrollment(SIS_SECTION_ID, SIS_USER_ID, 'deactivate');
        enrollment = await canvas.sections.getEnrollment(SIS_SECTION_ID, SIS_USER_ID);
        assert.equal(enrollment.enrollment_state, 'inactive');
        await canvas.sections.changeEnrollment(SIS_SECTION_ID, SIS_USER_ID, 'delete');
        assert.ok(! await canvas.sections.isEnrolled(SIS_SECTION_ID, SIS_USER_ID));

        // Users
        assert.ok(await canvas.users.exists(SIS_USER_ID));
        assert.ok(! await canvas.users.exists(uuid()));
        const userTmp = await canvas.users.get(SIS_USER_ID);
        assert.equal(userTmp.id, user.id);
        assert.equal(userTmp.name, USER_NAME);
        assert.equal(userTmp.sortable_name, USER_NAME);
        assert.equal(userTmp.short_name, USER_NAME);
        assert.equal(userTmp.sis_user_id, SIS_USER_ID);
        assert.equal(userTmp.login_id, USER_LOGIN_ID);
        assert.equal(userTmp.email, USER_EMAIL);
        assert.equal((await canvas.users.getById(user.id)).sis_user_id, SIS_USER_ID);
        await canvas.users.setSisId(user.id, NEW_SIS_USER_ID);
        assert.equal(NEW_SIS_USER_ID, (await canvas.users.getById(user.id)).sis_user_id);
        await canvas.users.setSisIdByLoginId(USER_LOGIN_ID, SIS_USER_ID);
        assert.equal(SIS_USER_ID, (await canvas.users.getById(user.id)).sis_user_id);
        
        // Observers
        assert.ok(await canvas.users.addObservee(SIS_USER_ID, SIS_USER_ID2));
        let observees = await canvas.users.listObservees(SIS_USER_ID);
        assert.equal(observees.length, 1);
        assert.equal(observees[0].sis_user_id, SIS_USER_ID2);
        await canvas.users.deleteObservee(SIS_USER_ID, SIS_USER_ID2);
        observees = await canvas.users.listObservees(SIS_USER_ID);
        assert.equal(observees.length, 0);
        await canvas.users.addObservee(SIS_USER_ID, SIS_USER_ID2);
        observees = await canvas.users.listObservees(SIS_USER_ID);
        assert.equal(observees.length, 1);
        await canvas.users.deleteAllObservees(SIS_USER_ID);
        observees = await canvas.users.listObservees(SIS_USER_ID);
        assert.equal(observees.length, 0);
    } catch(e) {
        console.error(e);
    }

    /****************** Cleanup ******************/
    await canvas.sections.delete(SIS_SECTION_ID);
    await canvas.courses.delete(SIS_COURSE_ID);
    await canvas.terms.delete(SIS_TERM_ID);
    await canvas.accounts.delete(SIS_ACCOUNT_ID);

    /****************** End Cleanup ******************/
    console.log(`****************** Tests Completed ******************`);
}
