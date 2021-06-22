import auth from 'express-zetkin-auth';
import cookieParser from 'cookie-parser';
import Raven from 'raven';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import express from 'express';
import helmet from 'helmet';
import http from 'http';
import url from 'url';
import path from 'path';

import api from './api';
import dataRouter from './datarouter';
import widgets from './widgets';
import prints from './prints';
import { loadLocaleHandler } from './locale';
import App from '../components/App';
import ActivistPage from '../components/fullpages/ActivistPage';
import IntlReduxProvider from '../components/IntlReduxProvider';
import ServerErrorPage from "../components/ServerErrorPage";
import { setPanesFromUrlPath } from '../actions/view';

const packageJson = require('../../../package.json');


const SENTRY_DSN = process.env.SENTRY_DSN;

if (SENTRY_DSN) {
    const ravenConfig = {
        release: packageJson.version,
        environment: process.env.NODE_ENV,
        tags: {
            domain: process.env.ZETKIN_DOMAIN,
        },
    };

    Raven.config(SENTRY_DSN, ravenConfig).install();
}


const authOpts = {
    secret: process.env.TOKEN_SECRET,
    minAuthLevel: 2,
    ssl: (process.env.ZETKIN_USE_TLS == '1')
        && (process.env.NODE_ENV == 'production'),
    zetkinDomain: process.env.ZETKIN_DOMAIN,
    app: {
        id: process.env.ZETKIN_APP_ID,
        secret: process.env.ZETKIN_APP_KEY,
    }
};


export default function initApp(messages) {
    let app = express();

    if (SENTRY_DSN) {
        app.use(Raven.requestHandler());
    }

    if (process.env.NODE_ENV !== 'production') {
        // When not in production, redirect requests for the main JS file to the
        // Webpack dev server running on localhost.
        app.get('/static/main.js', function(req, res) {
            let wpMainJs = url.format({
                hostname: req.host,
                port: process.env.WEBPACK_PORT || 81,
                pathname: '/static/main.js',
                protocol: 'http',
            });

            res.redirect(303, wpMainJs);
        });
    }

    app.use('/favicon.ico', (req, res) =>
        res.status(404).type('txt').send('Not found'));

    app.use('/static/', express.static(
        path.join(__dirname, '../../static'),
        { fallthrough: false }));

    app.use(cookieParser());
    app.use(helmet({
        hsts: authOpts.ssl,
    }));

    app.get('/logged-out', (req, res) => {
        res.redirect('//www.' + process.env.ZETKIN_DOMAIN);
    });

    app.use(auth.initialize(authOpts));
    app.use(auth.validate(authOpts));
    app.get('/logout', auth.logout(authOpts));

    app.use(dataRouter(messages));
    app.use('/api', api);
    app.get('/l10n', loadLocaleHandler());
    app.use('/widgets', widgets);

    app.use('/prints', prints);

    app.get('/activist', function(req, res, next) {
        if (req.store.getState().user.memberships.length) {
            // Officials should not be able to see the message to non-officials,
            // which would be very confusing.
            res.redirect(303, '/');
        }
        else {
            renderReactPage(ActivistPage, req, res);
        }
    });

    if (SENTRY_DSN) {
        app.use(Raven.errorHandler());
    }

    app.use(function(req, res, next) {
        if (req.store.getState().user.memberships.length == 0) {
            // User has no official roles in any organization
            res.redirect(303, '/activist');
            return;
        }

        renderReactPage(App, req, res);
    });

    return app;
}

function renderReactPage(Component, req, res) {
    // Remove all segments of path representing panes that refer to draft data,
    // which will not be available after a refresh.
    let pathWithoutDrafts = req.path
        .split('/')
        .filter(s => s.indexOf(':$') < 0 && s.indexOf(',$') < 0)
        .join('/');

    // If there were references to drafts, redirect to path without drafts.
    if (pathWithoutDrafts !== req.path) {
        res.redirect(pathWithoutDrafts);
        return;
    }

    try {
        req.store.dispatch(setPanesFromUrlPath(req.path));

        var PageFactory = React.createFactory(Component);
        var props = {
            initialState: req.store.getState(),
            path: req.path,
        };

        var html = ReactDOMServer.renderToString(
            React.createElement(IntlReduxProvider, { store: req.store },
                PageFactory(props)));

        res.send(html);
    }
    catch (err) {
        if (SENTRY_DSN) {
            Raven.captureException(err);
        }
        else {
            console.error(err);
        }

        var PageFactory = React.createFactory(ServerErrorPage);
        var html = ReactDOMServer.renderToString(
            React.createElement(IntlReduxProvider, { store: req.store },
                PageFactory()));

        res.send(html);
    }
}
