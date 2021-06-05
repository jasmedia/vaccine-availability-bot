require('dotenv').config()
const got = require('got')
var CronJob = require('cron').CronJob;
const { format, add } = require('date-fns')
const baseUrl = process.env.BASE_URL;
const telgramToken = process.env.TELEGRAM_TOKEN;
const telegramBaseUrl = process.env.TELEGRAM_BASE_URL;
const channelId = process.env.CHANNEL_ID;
const centerId = process.env.CENTER_ID;
console.log("Server initiated");
/**
 * Send Message to Telegram 
 * @param {String} msg formatted message string
 */
const sendMessage = async(msg) => {
    // https://api.telegram.org/bot<token>/sendMessage?chat_id=@localcowinavailability&text=Hi

    try {
        const url = telegramBaseUrl + `${telgramToken}/sendMessage?chat_id=${channelId}&text=${encodeURI(msg)}&parse_mode=Markdown`
        const response = await got(url);
        console.log(response.body);
        //=> '<!doctype html> ...'
    } catch (error) {
        console.log(error.response);
        //=> 'Internal server error ...'
    }

}

/**
 * Fetch Vaccine Availability details from Cowin public api.
 * @returns Vaccine availability details
 */
const fetchAvailabiltyDetails = async() => {
    return new Promise(async(resolve, reject) => {
        try {
            const date = format(add(new Date(), { days: 0 }), 'dd-MM-yyyy')
            console.log(date);
            // const url = baseUrl + `calendarByPin?pincode=676528&date=${date}`;
            const url = baseUrl + `calendarByCenter?center_id=${centerId}&date=${date}`;
            const response = await got(url);
            /** 
             * {"centers":[{"center_id":126622,"name":"Othukkungal PHC","address":"Parakkala Othukkungal-Panakkad Road Othukkungal","state_name":"Kerala","district_name":"Malappuram","block_name":"Vengara CHC","pincode":676528,"lat":11,"long":76,"from":"09:00:00","to":"13:00:00","fee_type":"Free","sessions":[{"session_id":"a42a9531-7500-4214-8f44-33e120d3944f","date":"05-06-2021","available_capacity":0,"min_age_limit":45,"vaccine":"COVISHIELD","slots":["09:00AM-10:00AM","10:00AM-11:00AM","11:00AM-12:00PM","12:00PM-01:00PM"],"available_capacity_dose1":0,"available_capacity_dose2":0}]}]}
             */
            if (!response.body) {
                reject();
            }
            const result = JSON.parse(response.body)

            console.log(result.centers);
            const center = result.centers;
            const name = center.name;
            const type = center.fee_type;
            // FIXME: need to handle more than one session.
            const session = center.sessions[0];
            const sessionDate = session.date;
            const availability = session.available_capacity;
            const ageLimit = session.min_age_limit;
            const vaccine = session.vaccine;
            const dose1_availability = session.available_capacity_dose1;
            const dose2_availability = session.available_capacity_dose2;
            resolve({ name, sessionDate, type, availability, ageLimit, vaccine, dose1_availability, dose2_availability });
        } catch (error) {
            console.log(error.response);
            reject(error);
        }
    });

}

formatMessage = (data) => {
    const text = `*Center:* ${data.name} \n` +
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
    fetchAvailabiltyDetails().then((data) => {
        // console.log(data);
        // Send message to Telegram if vaccine slot available.
        // console.log('Data:', data);
        if (data.availability > 0) {
            const formatted = formatMessage(data)

            sendMessage(formatted)
        } else {
            console.log('Slots unavailable', new Date());
        }


    }).catch(err => {
        console.log(err);
    });

}

// fetch availabilty details every 10 minute
// check the vaccine availabity
// format text if vaccine available
// send to telegram

var job = new CronJob('0 */10 * * * *', function() {
    console.log('You will see this message every10 minute', new Date());
    main();
}, null, true, 'Asia/Kolkata');

job.start();