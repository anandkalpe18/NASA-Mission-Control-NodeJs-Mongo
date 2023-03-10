const axios = require('axios');

const launches = require('./launches.mongo');
const planets = require('./planets.mongo');

const DEFAULT_FLIGHT_NUMBER = 100;

// const launch = {
//     flightNumber : 100,     //flight_number 
//     mission : 'Kepler Exploration X',   //name
//     rocket : 'Explorer IS1',        //rocket.name   
//     launchDate : new Date('December 27, 2030'),     //date_local
//     target : 'Kepler-442 b',            //not applicable    
//     customers : ['Akengi', 'NASA'],     //payloads.customers    
//     upcoming : true,        //upcoming
//     success : true,         //success
// };

// saveLaunch(launch);

const SPACEX_API_URL = 'https://api.spacexdata.com/v4/launches/query';

async function populateLaunches(){
    console.log("Downloading launch data...");
    const response = await axios.post(SPACEX_API_URL, {
        query : {},
        options : {
            pagination : false,         //If pagination is true, we only get some responses for that page like 10/page
            //But setting it false given all in response
            populate : [
                {
                    path : 'rocket',
                    select : {
                        name : 1
                    }
                }, 
                {
                    path : 'payloads',
                    select : {
                        'customers' : 1
                    }
                }
            ]
        }
    
    });

    if(response.status !==200){
        console.log("Problem downloading launch data");
        throw new Error('Launch Data download failed!');
    }

    const launchDocs = response.data.docs;
    for(const launchDoc of launchDocs){
        const payloads = launchDoc['payloads'];
        const customers = payloads.flatMap((payload) =>{
            return payload['customers'];
        })

        const launch = {
            flightNumber : launchDoc['flight_number'],
            mission : launchDoc['name'],
            rocket : launchDoc['rocket']['name'],
            launchDate : launchDoc['date_local'],
            customers : customers,
            upcoming : launchDoc['upcoming'],
            success : launchDoc['success'],
        };

        console.log(`${launch.flightNumber} and ${launch.mission}`);

        await saveLaunch(launch);
    }
}

async function loadLaunchesData() {
    const firstLaunch = await findLaunch({
        flightNumber : 1, 
        rocket : 'Falcon 1', 
        mission : 'FalconSat'
    });

    if(firstLaunch){
        console.log("Launch data already loaded!!");
    }
    else{   
        await populateLaunches();
    }
    
}

async function findLaunch(filter){
    return await launches.findOne(filter);
}

async function existsLaunchWithId(launchId){
    return await findLaunch({
        flightNumber : launchId,
    })
}

async function getLatestFlightNumber(){
    const latestLaunch = await launches
        .findOne()
        .sort('-flightNumber');

    if(!latestLaunch){
        return DEFAULT_FLIGHT_NUMBER;
    }

    return latestLaunch.flightNumber;
}

async function getAllLaunches(skip, limit) {
    return await launches
    .find({}, {'_id':0, '__v': 0})
    .sort({flightNumber : 1})       //-1 for descending
    .skip(skip)
    .limit(limit)
}

async function saveLaunch(launch){
    await launches.findOneAndUpdate({
        flightNumber : launch.flightNumber,
    }, launch, {
        upsert : true,
    });
}

async function scheduleNewLaunch(launch){
    const planet = await planets.findOne({
        kepler_name : launch.target,
    });

    if(!planet){
        throw new Error('No matching planet found');
    }
 
    const newFlightNumber = await getLatestFlightNumber() + 1;
   
    const newLaunch = Object.assign(launch, {
        success : true,
        upcoming : true,
        customers : ['Akengi', 'NASA'],
        flightNumber : newFlightNumber
    
    });

    await saveLaunch(newLaunch);

}


async function abortLaunchById(launchId){
    const aborted = await launches.updateOne({
        flightNumber : launchId,
    }, {
        upcoming : false, 
        success : false,
    });
    return aborted;
}

module.exports = {
    loadLaunchesData,   
    getAllLaunches,
    existsLaunchWithId, 
    abortLaunchById,
    scheduleNewLaunch
};