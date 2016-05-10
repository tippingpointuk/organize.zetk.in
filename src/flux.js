import Flummox from 'flummox';
import { Dispatcher } from 'flux';

import ParticipantActions from './actions/participant';
import ParticipantStore from './stores/participant';
import QueryActions from './actions/query';
import QueryStore from './stores/query';
import ReminderActions from './actions/reminder';


export default class QueuedDispatcher extends Dispatcher {
    constructor() {
        super();

        this.payloads = [];
    }

    dispatch(payload) {
        if (!this.isDispatching()) {
            super.dispatch(payload);
            this.dispatchQueue();
        }
        else {
            this.addToQueue(payload);
        }
    }

    addToQueue(payload) {
        this.payloads.push(payload);
    }

    dispatchQueue() {
        if (!this.payloads.length) {
            return false;
        }

        this.dispatch(this.payloads.shift());
    }
}


export default class Flux extends Flummox {
    constructor() {
        super();

        this.dispatcher = new QueuedDispatcher();

        this.createActions('participant', ParticipantActions, this);
        this.createActions('query', QueryActions);
        this.createActions('reminder', ReminderActions, this);

        this.createStore('participant', ParticipantStore, this);
        this.createStore('query', QueryStore, this);
    }
}
