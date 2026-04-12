import { authentication } from './authentication';
import { newLead } from './triggers/newLead';
import { quizCompleted } from './triggers/quizCompleted';
import { createQuiz } from './actions/createQuiz';

/**
 * Zapier Native App definition for Squarespell
 * This configuration allows users to trigger Zapier workflows based on Squarespell events
 * and perform actions in Squarespell from other apps.
 */
export const zapierApp = {
  version: '1.0.0',
  platformVersion: '10.0.0',

  authentication,

  beforeRequest: [],
  afterResponse: [],

  resources: {},

  triggers: [newLead, quizCompleted],
  actions: [createQuiz],

  searchOrCreatables: [],
};

export default zapierApp;
