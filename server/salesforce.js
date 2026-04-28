const axios = require('axios');
require('dotenv').config();

class SalesforceService {
    constructor() {
        this.instanceUrl = process.env.SF_INSTANCE_URL;
        this.accessToken = null; // Should be fetched via OAuth
    }

    /**
     * Fetches active Klient Projects and Tasks for the current user.
     */
    async fetchHierarchy() {
        if (!this.accessToken) throw new Error('Not authenticated with Salesforce');

        const query = `
            SELECT Name, Id, 
                (SELECT Name, Id FROM Krow__Tasks__r) 
            FROM Krow__Project__c 
            WHERE Krow__Project_Status__c = 'Active'
        `;

        const response = await axios.get(`${this.instanceUrl}/services/data/v60.0/query`, {
            params: { q: query },
            headers: { Authorization: `Bearer ${this.accessToken}` }
        });

        return response.data.records;
    }

    /**
     * Syncs a finalized timesheet entry to Klient.
     */
    async syncTimeEntry(entry) {
        if (!this.accessToken) throw new Error('Not authenticated with Salesforce');

        const payload = {
            Krow__Project__c: entry.project_id,
            Krow__Task__c: entry.task_id,
            Krow__Date__c: entry.date,
            Krow__Hours__c: entry.hours,
            Krow__Notes__c: entry.notes
        };

        const response = await axios.post(
            `${this.instanceUrl}/services/data/v60.0/sobjects/Krow__Timesheet_Split__c/`,
            payload,
            { headers: { Authorization: `Bearer ${this.accessToken}` } }
        );

        return response.data;
    }
}

module.exports = new SalesforceService();
