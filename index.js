const env = require('dotenv').config()
const got = require('got')
const async = require('async');
var CronJob = require('cron').CronJob;
const { format, add } = require('date-fns')
const logger = require('./config/logger')
const baseUrl = process.env.BASE_URL;
const telgramToken = process.env.TELEGRAM_TOKEN;
const telegramBaseUrl = process.env.TELEGRAM_BASE_URL;
const channelId = process.env.CHANNEL_ID;
const districtIds = JSON.parse(process.env.DISTRICT_IDS);
const centers = JSON.parse(process.env.CENTERS);
logger.info(`Server initiated on Districst ${districtIds} and Centers ${centers}`);

/**
 * Send Message to Telegram
 * @param {String} msg formatted message string
 */
const sendMessage = async(name, msg) => {
    // https://api.telegram.org/bot<token>/sendMessage?chat_id=@localcowinavailability&text=Hi

    try {
        const url = telegramBaseUrl + `${telgramToken}/sendMessage?chat_id=${channelId}&text=${encodeURI(msg)}&parse_mode=Markdown`
        await got(url);
        logger.info(`message sent ${name}`)
    } catch (error) {
        logger.error(error);
    }

}

/**
 * Fetch Vaccine Availability details from Cowin public api.
 * @returns Vaccine availability details
 */
const fetchAvailabiltyDetails = async(districtId) => {
    return new Promise(async(resolve, reject) => {
        try {
            const date = format(add(new Date(), { days: 0 }), 'dd-MM-yyyy')
            logger.info(`Current date: ${date}`)

            // const url = baseUrl + `calendarByPin?pincode=676528&date=${date}`;
            const url = baseUrl + `calendarByDistrict?district_id=${districtId}&date=${date}`;
            const response = await got(url);

            const result = JSON.parse(response.body)
            if (result.centers) {
                resolve(result.centers);
            } else {
                reject();
            }
        } catch (error) {
            logger.error(error);
            reject(error);
        }
    });

}

formatMessage = (data) => {
    const text = `*Center:* ${data.name} \n` +
        `*Address:* ${data.address} \n` +
        `*Date:* ${data.sessionDate} \n` +
        `*Fee:* ${data.type} \n` +
        `*Availability:* ${data.availability} \n` +
        `*Age Limit:* ${data.ageLimit} \n` +
        `*Vaccine Type:* ${data.vaccine} \n` +
        `*Dose 1 availability:* ${data.dose1_availability} \n` +
        `*Dose 2 availability:* ${data.dose2_availability} \n`;
    return text;
}


const main = () => {
    async.eachSeries(districtIds, function(districtId, callback) {
        fetchAvailabiltyDetails(districtId).then(data => {
            // Send message to Telegram if vaccine slot available.
            let selectedCenters = data.filter(center => centers.indexOf(center.center_id) !== -1)

            logger.info(`Selected Centers: ${selectedCenters.length}`);
            // Filter vaccine available centers and send message if avaialble.
            async.eachSeries(selectedCenters, function(center, cb) {
                const name = center.name;
                const address = center.address;
                const type = center.fee_type;
                const sessions = center.sessions;
                sessions.forEach(async session => {
                    if (session.available_capacity > 0) {
                        const sessionDate = session.date;
                        const availability = session.available_capacity;
                        const ageLimit = session.min_age_limit;
                        const vaccine = session.vaccine;
                        const dose1_availability = session.available_capacity_dose1;
                        const dose2_availability = session.available_capacity_dose2;
                        const formatted = await formatMessage({ name, address, type, sessionDate, availability, ageLimit, vaccine, dose1_availability, dose2_availability })

                        await sendMessage(name, formatted)
                    } else {
                        logger.warn(`Not available at: ${name}`);
                    }
                })
                cb();
            }, function(err) {
                if (err) logger.error(err);
                callback();

            })



        }).catch(err => {
            logger.error(err);
            callback();
        });
    }, function(err) {
        console.log('Finished');
    })

}

// fetch availabilty details every 10 minute
// check the vaccine availabity
// format text if vaccine available
// send to telegram

var job = new CronJob('0 */10 * * * *', function() {
    logger.info('Job running at 10min interval');
    main();
}, null, true, 'Asia/Kolkata');

job.start();