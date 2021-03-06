#!/usr/bin/env node

const https = require('https');
const {
    extractLabels,
    getAlertName,
    getServers,
    handleError,
} = require('./helpers');

main()

async function main() {
    const servers = getServers();
    const alertName = getAlertName();
    const resultGetter = generateResultGetter(alertName);

    servers.forEach(resultGetter);

    function generateResultGetter(alertName) {
        return function (server) {
            return getResult(alertName, server);
        }
    }
}


function getResult(alertName, server) {
    https.get(`${ server }/api/v1/rules?type=alerts`, handler).on('error', errorForServer);

    function errorForServer() {
        return handleError({ server });
    }

    function handler(response) {
        let body = '';
        response.on('data', dechunker)
        response.on('end', print);

        function print() {
            try {
                const { status, data } = JSON.parse(body.replace(/([\+-]Inf)/g, '"$1"'));
                if (status === 'success') {
                    const { rules } = data.groups[0];
                    const alerts = rules.filter(alert => alert.name === alertName);
                    if (alerts.length) {
                        console.log('\x1b[32m%s\x1b[0m', `${ server }:`);
                        console.log(alerts.map(extractLabels).join('\n'));
                        console.log('======================================================');
                    } else {
                        console.log('\x1b[33m%s\x1b[0m', `No matching alerts found on ${ server }.`)
                    }
                }
            } catch (error) {
                handleError({ server, statusCode: response.statusCode })
            }
        }

        function dechunker(chunk) {
            body += chunk.toString();
        }
    }
}


module.exports = { main };
