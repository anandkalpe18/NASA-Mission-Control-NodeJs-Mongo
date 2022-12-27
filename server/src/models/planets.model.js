//We have csv file thus we will be using csv-parse package to parse that file
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse');

const planets = require('./planets.mongo');

function isHabitablePlanet(planets){
    return planets['koi_disposition']==='CONFIRMED'
        && planets['koi_insol'] > 0.36 && planets['koi_insol'] < 1.11
        && planets['koi_prad'] < 1.6;
}

function loadPlanetsData(){
    return new Promise((resolve, reject) => {
            fs.createReadStream(path.join(__dirname, '..', '..', 'data', 'kepler_data.csv'))
            .pipe(parse({
                comment : '#',
                columns : true,
            }))
            .on('data', async (data)=>{
                if(isHabitablePlanet(data)){
                    //habitablePlanets.push(data);
                    //TODO : Replace below create with update + insert = upsert
                    //Whenever we start the server this loadPlanetsData() function would be called again and again
                    //This can cause duplicate data in our mongoose database
                    //Thus we use upsert function which adds only that data which is not present in the database

                    // await planets.create({
                    //     kepler_name : data.kepler_name,
                    // });

                    savePlanet(data);


                }
            })
            .on('error', (err)=>{
                console.log(err);
                reject(err);
            })
            .on('end', async ()=>{
                const countPlanetsFound = (await getAllPlanets()).length;
                console.log(`${countPlanetsFound} Habitable planets are found`);
                resolve();
            });
    });
}

async function getAllPlanets() {
    return await planets.find({}, {
        //To exclude id and v in api responses.
        //try in postman with and without these exclude fields
        '_id' : 0, '__v' : 0,
    });
}

async function savePlanet(planet){
  try{
    await planets.updateOne({
        kepler_name : planet.kepler_name,
    },{
        kepler_name : planet.kepler_name,
    },{
        upsert : true,
    });
  } 
  catch(err){
    console.error(`Could not save planet ${err}`);
  }
}

module.exports = {
    loadPlanetsData,
    getAllPlanets
};

