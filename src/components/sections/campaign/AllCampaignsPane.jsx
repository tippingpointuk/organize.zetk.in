import React from 'react';
import { connect } from 'react-redux';

import Button from "../../misc/Button";
import CampaignList from "../../lists/CampaignList";
import CampaignListItem from "../../lists/items/CampaignListItem";
import RootPaneBase from '../RootPaneBase';
import { retrieveCampaigns } from '../../../actions/campaign';


const mapStateToProps = state => {
    const orgId = state.user.activeMembership.organization.id;
    const campaigns = state.campaigns;
    if(campaigns.campaignList && !campaigns.campaignList.isPending) {
        campaigns.campaignList.items = campaigns.campaignList.items.filter(i => i.data.organization.id == orgId);
    }

    return {
        campaigns: campaigns
    }
};

@connect(mapStateToProps)
export default class AllCampaignsPane extends RootPaneBase {
    constructor() {
        super();
    }

    componentDidMount() {
        this.props.dispatch(retrieveCampaigns());
    }

    getPaneTools(data) {
        return <Button className="AllCampaignsPane-addButton"
                labelMsg="panes.allCampaigns.addButton"
                onClick={ this.onCreateCampaign.bind(this) }/>;
    }

    onEditCampaign(campaign) {
        this.openPane('editcampaign', campaign.data.id);
    }

    onCreateCampaign() {
        this.openPane('addcampaign');
    }

    renderPaneContent() {
        return <CampaignList className="CampaignList"
            campaignList={ this.props.campaigns.campaignList }
            onItemClick={ this.onEditCampaign.bind(this) }
        />
    }
}
