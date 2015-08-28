import { Store } from 'flummox';

import StoreUtils from '../utils/StoreUtils';


export default class ActionStore extends Store {
    constructor(flux) {
        super();

        this.flux = flux;

        this.setState({
            actions: []
        });

        var actionActions = flux.getActions('action');
        this.register(actionActions.retrieveAllActions,
            this.onRetrieveAllActionsComplete);
        this.register(actionActions.retrieveAction,
            this.onRetrieveActionComplete);
        this.register(actionActions.updateAction,
            this.onUpdateActionComplete);
    }

    getAction(id) {
        return this.state.actions.find(a => (a.id == id));
    }

    getActions() {
        const campaignStore = this.flux.getStore('campaign');
        const campaign = campaignStore.getSelectedCampaign();

        if (campaign) {
            return this.state.actions.filter(action =>
                (action.campaign.id == campaign.id))
        }
        else {
            return this.state.actions;
        }
    }

    onRetrieveAllActionsComplete(res) {
        this.setState({
            actions: res.data.data.sort((a0, a1) =>
                (new Date(a0.start_time)).getTime() -
                (new Date(a1.start_time)).getTime())
        });
    }

    onRetrieveActionComplete(res) {
        var action = res.data.data;
        StoreUtils.updateOrAdd(this.state.actions, action.id, action);

        this.setState({
            actions: this.state.actions.sort((a0, a1) =>
                (new Date(a0.start_time)).getTime() -
                (new Date(a1.start_time)).getTime())
        });
    }

    onUpdateActionComplete(res) {
        var action = res.data.data;
        StoreUtils.updateOrAdd(this.state.actions, action.id, action);

        this.setState({
            actions: this.state.actions.sort((a0, a1) =>
                (new Date(a0.start_time)).getTime() -
                (new Date(a1.start_time)).getTime())
        });
    }

    static serialize(state) {
        return JSON.stringify(state);
    }

    static deserialize(stateStr) {
        return JSON.parse(stateStr);
    }
}
