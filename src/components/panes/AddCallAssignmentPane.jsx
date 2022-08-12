import React from 'react';
import { injectIntl, FormattedMessage as Msg } from 'react-intl';
import { connect } from 'react-redux';
import cx from 'classnames';

import PaneBase from './PaneBase';
import CallAssignmentForm from '../forms/CallAssignmentForm';
import Button from '../misc/Button';
import Link from '../misc/Link';
import { retrieveCampaigns } from '../../actions/campaign';
import { retrieveSurveys } from '../../actions/survey';
import { retrievePersonTags } from '../../actions/personTag';
import { retrieveCallAssignment, createCallAssignment }
    from '../../actions/callAssignment';

import InformTemplate from '../misc/callAssignmentTemplates/InformTemplate';
import MobilizeTemplate from '../misc/callAssignmentTemplates/MobilizeTemplate';
import SurveyTemplate from '../misc/callAssignmentTemplates/SurveyTemplate';
import StayInTouchTemplate from '../misc/callAssignmentTemplates/StayInTouchTemplate';
import TagTargetTemplate from '../misc/callAssignmentTemplates/TagTargetTemplate';
import AllTargetTemplate from '../misc/callAssignmentTemplates/AllTargetTemplate';
import RandomTargetTemplate from '../misc/callAssignmentTemplates/RandomTargetTemplate';


const STEPS = [ 'target', 'goal', 'form' ];

const mapStateToProps = state => ({
    campaignList: state.campaigns.campaignList,
    surveyList: state.surveys.surveyList,
    tagList: state.personTags.tagList,
});

@connect(mapStateToProps)
@injectIntl
export default class AddCallAssignmentPane extends PaneBase {
    constructor(props) {
        super(props);

        this.state = {
            step: 'target',
            targetType: null,
            targetConfig: {},
            goalType: null,
            goalConfig: {},
            assignment: null,
        };
    }

    getRenderData() {
        return {
            campaigns: this.props.campaignList.items.map(i => i.data),
            surveys: this.props.surveyList.items.map(i => i.data),
            tags: this.props.tagList.items.map(i => i.data),
        }
    }

    getPaneTitle(data) {
        const formatMessage = this.props.intl.formatMessage;
        return formatMessage({ id: 'panes.addCallAssignment.title' });
    }

    renderPaneContent(data) {
        let assignment = this.state.assignment;

        let stepIdx = STEPS.indexOf(this.state.step);
        let breadcrumbs = (
            <ul key="breadcrumbs" className="AddCallAssignmentPane-breadcrumbs">
            { STEPS.map((step, idx) => {
                let classes = cx('AddCallAssignmentPane-breadcrumb', {
                    past: idx < stepIdx,
                    current: idx === stepIdx,
                    future: idx > stepIdx,
                });

                let labelMsgId = 'panes.addCallAssignment.breadcrumbs.' + step + 'Label';

                let value = null;
                let valueMsgId = 'panes.addCallAssignment.breadcrumbs.';
                if (step == 'goal' && this.state.goalType) {
                    valueMsgId += 'goals.' + this.state.goalType;
                    value = (
                        <Msg id={ valueMsgId }/>
                    );
                }
                else if (step == 'target' && this.state.targetType) {
                    valueMsgId += 'targets.' + this.state.targetType;
                    value = (
                        <Msg id={ valueMsgId }/>
                    );
                }

                return (
                    <li key={ step } className={ classes }>
                        <a onClick={ this.onStepClick.bind(this, step) }>
                            <Msg id={ labelMsgId }/>
                            { value }
                        </a>
                    </li>
                );
            }) }
            </ul>
        );

        if (this.state.step === 'target') {
            return [
                breadcrumbs,
                <Msg tagName="p" key="instructions"
                    id="panes.addCallAssignment.target.instructions"/>,
                <div key="templates">
                    <AllTargetTemplate tags={ data.tags }
                        config={ this.state.targetConfig }
                        selected={ this.state.targetType == 'allTarget' }
                        onConfigChange={ this.onTargetConfigChange.bind(this) }
                        onSelect={ this.onTargetSelect.bind(this) }/>
                    <TagTargetTemplate tags={ data.tags }
                        config={ this.state.targetConfig }
                        selected={ this.state.targetType == 'tagTarget' }
                        onConfigChange={ this.onTargetConfigChange.bind(this) }
                        onSelect={ this.onTargetSelect.bind(this) }/>
                    <RandomTargetTemplate tags={ data.tags }
                        config={ this.state.targetConfig }
                        selected={ this.state.targetType == 'randomTarget' }
                        onConfigChange={ this.onTargetConfigChange.bind(this) }
                        onSelect={ this.onTargetSelect.bind(this) }/>
                    <Link className="AddCallAssignmentPane-customLink"
                        msgId="panes.addCallAssignment.target.customLink"
                        onClick={ this.onTargetSelect.bind(this, 'custom') }/>
                </div>
            ];
        }
        else if (this.state.step === 'goal') {
            return [
                breadcrumbs,
                <Msg tagName="p" key="instructions"
                    id="panes.addCallAssignment.goal.instructions"/>,
                <div key="templates">
                    <InformTemplate
                        config={ this.state.goalConfig }
                        selected={ this.state.goalType == 'inform' }
                        onConfigChange={ this.onGoalConfigChange.bind(this) }
                        onSelect={ this.onGoalSelect.bind(this) }/>
                    <MobilizeTemplate campaigns={ data.campaigns }
                        config={ this.state.goalConfig }
                        selected={ this.state.goalType == 'mobilize' }
                        onConfigChange={ this.onGoalConfigChange.bind(this) }
                        onSelect={ this.onGoalSelect.bind(this) }/>
                    <SurveyTemplate surveys={ data.surveys }
                        config={ this.state.goalConfig }
                        selected={ this.state.goalType == 'survey' }
                        onConfigChange={ this.onGoalConfigChange.bind(this) }
                        onSelect={ this.onGoalSelect.bind(this) }/>
                    <StayInTouchTemplate
                        config={ this.state.goalConfig }
                        selected={ this.state.goalType == 'stayintouch' }
                        onConfigChange={ this.onGoalConfigChange.bind(this) }
                        onSelect={ this.onGoalSelect.bind(this) }/>
                    <Link className="AddCallAssignmentPane-customLink"
                        msgId="panes.addCallAssignment.goal.customLink"
                        onClick={ this.onGoalSelect.bind(this, 'custom') }/>
                </div>,
            ];
        }
        else if (this.state.step === 'form') {
            return [
                breadcrumbs,
                <Msg tagName="p" key="instructions"
                    id="panes.addCallAssignment.form.instructions"/>,
                <CallAssignmentForm key="form" ref="form"
                    assignment={ assignment }
                    onSubmit={ this.onSubmit.bind(this) }/>,
            ];
        }
    }

    componentDidMount() {
        super.componentDidMount();

        this.props.dispatch(retrieveSurveys());
        this.props.dispatch(retrieveCampaigns());
        this.props.dispatch(retrievePersonTags());
    }

    renderPaneFooter(data) {
        let step = this.state.step;
        let msgId = 'panes.addCallAssignment.' + step + '.saveButton';

        if (step == 'goal') {
            msgId += '.' + this.state.goalType;
        }
        else if (step == 'target') {
            msgId += '.' + this.state.targetType;
        }

        let enabled = true;
        if (step == 'target') {
            enabled = (this.state.targetType
                && this.state.targetType != 'custom');
        }
        else if (step == 'goal') {
            enabled = (this.state.goalType
                && this.state.goalType != 'custom');
        }

        // TODO: Style differently instead of just hiding?
        if (enabled) {
            return (
                <Button className="AddCallAssignmentPane-saveButton"
                    labelMsg={ msgId }
                    onClick={ this.onSubmit.bind(this) }/>
            );
        }
        else {
            return null;
        }
    }

    gotoStep(step, newState) {
        let extraState = { step };

        if (step == 'form') {
            const formatMessage = this.props.intl.formatMessage;

            if (this.state.goalType == 'stayintouch') {
                let months = Math.round(this.state.goalConfig.interval/30);
                extraState.assignment = {
                    title: formatMessage(
                        { id: 'misc.callAssignmentTemplates.stayintouch.title' }),
                    description: formatMessage(
                        { id: 'misc.callAssignmentTemplates.stayintouch.desc' },
                        { months }),
                };
            }
            else if (this.state.goalType == 'inform') {
                extraState.assignment = {
                    title: formatMessage(
                        { id: 'misc.callAssignmentTemplates.inform.title' }),
                    description: formatMessage(
                        { id: 'misc.callAssignmentTemplates.inform.desc' }),
                };
            }
            else if (this.state.goalType == 'mobilize') {
                let campaignItem = this.props.campaignList.items
                    .find(i => i.data.id == this.state.goalConfig.campaignId);

                let campaign = campaignItem.data;

                extraState.assignment = {
                    title: formatMessage(
                        { id: 'misc.callAssignmentTemplates.mobilize.title' },
                        { campaign: campaign.title }),
                    description: formatMessage(
                        { id: 'misc.callAssignmentTemplates.mobilize.desc' },
                        { campaign: campaign.title }),
                };
            }
            else if (this.state.goalType == 'survey') {
                let surveyItem = this.props.surveyList.items
                    .find(i => i.data.id == this.state.goalConfig.surveyId);

                let survey = surveyItem.data;

                extraState.assignment = {
                    title: formatMessage(
                        { id: 'misc.callAssignmentTemplates.survey.title' },
                        { survey: survey.title }),
                    description: formatMessage(
                        { id: 'misc.callAssignmentTemplates.survey.desc' },
                        { survey: survey.title }),
                };
            }
            else {
                extraState.assignment = {
                    title: "",
                    description: "",
                };
            }

            let startDate = Date.create();
            let endDate = startDate.clone().addMonths(1);

            extraState.assignment.start_date = startDate.format('{yyyy}-{MM}-{dd}');
            extraState.assignment.end_date = endDate.format('{yyyy}-{MM}-{dd}');
            extraState.assignment.cooldown = 3;
        }

        this.setState(Object.assign({}, newState, extraState));
    }

    onStepClick(step) {
        this.gotoStep(step);
    }

    onTargetSelect(type) {
        this.gotoStep((type == 'custom')? 'goal' : this.state.step, {
            targetType: type,
        });
    }

    onTargetConfigChange(config) {
        this.setState({
            targetConfig: config,
        });
    }

    onGoalConfigChange(config) {
        this.setState({
            goalConfig: config,
        });
    }

    onGoalSelect(type) {
        this.gotoStep((type == 'custom')? 'form' : this.state.step, {
            goalType: type,
        });
    }

    onSubmit(ev) {
        if (this.state.step == 'target') {
            this.gotoStep('goal');
        }
        else if (this.state.step == 'goal') {
            this.gotoStep('form');
        }
        else if (this.state.step == 'form') {
            ev.preventDefault();

            let values = {
                expose_target_details: true,
                ...this.refs.form.getValues(),
            };

            if (this.state.targetType == 'allTarget') {
                values.target_filters = [{
                    type: 'all',
                    config: null,
                }];
            }
            else if (this.state.targetType == 'randomTarget') {
                values.target_filters = [{
                    type: 'random',
                    config: {
                        'size': this.state.targetConfig.size,
                    }
                }];
            }
            else if (this.state.targetType == 'tagTarget') {
                values.target_filters = [{
                    type: 'person_tags',
                    config: {
                        'condition': 'all',
                        'tags': [ this.state.targetConfig.tagId ],
                    }
                }];
            }
            else {
                values.target_filters = [];
            }

            if (this.state.goalType == 'stayintouch') {
                // Add filter to find people who have been contacted in the
                // selected number of months.
                values.goal_filters = [{
                    type: 'call_history',
                    config: {
                        operator: 'reached',
                        after: '-' + this.state.goalConfig.interval + 'd',
                    }
                }];
            }
            else if (this.state.goalType == 'inform') {
                // Add filter to find all who have been reached in this
                // particular call assignment. The $self expression is replaced
                // by the API with the ID of the newly created assignment
                values.goal_filters = [{
                    type: 'call_history',
                    config: {
                        operator: 'reached',
                        assignment: '$self',
                    }
                }];
            }
            else if (this.state.goalType ==  'mobilize') {
                // Add filter to find all who have future bookings in the
                // relevant campaign.
                values.goal_filters = [{
                    type: 'campaign_participation',
                    config: {
                        operator: 'in',
                        campaign: this.state.goalConfig.campaignId,
                        after: 'now',
                    }
                }];
            }
            else if (this.state.goalType == 'survey') {
                // Add filter to find all who responded to survey
                values.goal_filters = [{
                    type: 'survey_submission',
                    config: {
                        operator: 'submitted',
                        survey: this.state.goalConfig.surveyId,
                    },
                }];
            }
            else {
                values.goal_filters = [];
            }

            this.props.dispatch(createCallAssignment(
                values, this.props.paneData.id));
        }
    }
}
