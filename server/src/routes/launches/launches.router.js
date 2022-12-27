const express = require('express');

const {
        httpGetAllLaunches,
        httpAddNewLauch,
        httpAbortLaunch
      } = require('./launches.controller');

const launchesRouter = express.Router();

launchesRouter.get('/launches', httpGetAllLaunches);
launchesRouter.post('/launches', httpAddNewLauch);
launchesRouter.delete('/launches/:id',httpAbortLaunch);

module.exports = launchesRouter;