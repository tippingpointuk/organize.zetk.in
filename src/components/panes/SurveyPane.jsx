import React from 'react';
import { injectIntl, FormattedMessage as Msg } from 'react-intl';
import { connect } from 'react-redux';
import cx from 'classnames';

import PaneBase from './PaneBase';
import Button from '../misc/Button';
import Link from '../misc/Link';
import LoadingIndicator from '../misc/LoadingIndicator';
import { getListItemById } from '../../utils/store';
import { retrieveSurvey } from '../../actions/survey';
import InfoList from '../misc/InfoList';


const mapStateToProps = (state, props) => {
    let surveyId = props.paneData.params[0];

    return {
        elementList: state.surveys.elementsBySurvey[surveyId.toString()],
        surveyItem: getListItemById(state.surveys.surveyList, surveyId),
    };
};


@connect(mapStateToProps)
@injectIntl
export default class SurveyPane extends PaneBase {
    componentDidMount() {
        super.componentDidMount();

        let surveyItem = this.props.surveyItem;
        if (!surveyItem || surveyItem.data || !surveyItem.data.elements) {
            this.props.dispatch(retrieveSurvey(this.getParam(0)));
        }
    }

    getPaneTitle(data) {
        let surveyItem = this.props.surveyItem;
        if (surveyItem && surveyItem.data && !surveyItem.isPending) {
            return this.props.surveyItem.data.title;
        }
        else {
            return null;
        }
    }

    renderPaneContent(data) {
        let surveyItem = this.props.surveyItem;
        if (surveyItem && !surveyItem.isPending) {
            let survey = surveyItem.data;
            let accessLabelMsgId = 'panes.survey.summary.access.' + survey.access;

            let anonymousLabelMsgId = null;
            if (survey.allow_anonymous) {
                anonymousLabelMsgId = 'panes.survey.summary.anonymous.allow';
            }
            else {
                anonymousLabelMsgId = 'panes.survey.summary.anonymous.deny';
            }

            let linkUrl = '//www.' + process.env.ZETKIN_DOMAIN + '/o/'
                + survey.organization.id + '/surveys/' + survey.id;

            let contentBreakdown = null;
            if (this.props.elementList && this.props.elementList.items) {
                let numQuestions = this.props.elementList.items
                    .filter(i => i.data.type == 'question')
                    .length;

                let numTextBlocks = this.props.elementList.items
                    .filter(i => i.data.type == 'text')
                    .length;

                contentBreakdown = (
                    <ul className="SurveyPane-contentBreakdown">
                        <li className="SurveyPane-contentBreakdown-questions">
                            <Msg id="panes.survey.content.numQuestions"
                                values={{ count: numQuestions }}/>
                        </li>
                        <li className="SurveyPane-contentBreakdown-text">
                            <Msg id="panes.survey.content.numTextBlocks"
                                values={{ count: numTextBlocks }}/>
                        </li>
                    </ul>
                );
            }

            let statusMsgId = null;
            if (survey.archived) {
                statusMsgId = 'panes.survey.summary.status.archived';
            } else {
                statusMsgId = 'panes.survey.summary.status.active';
            }
            let infoListData = [
                { name: 'desc', value: survey.info_text },
                { name: 'access', msgId: accessLabelMsgId },
                { name: 'anonymous', msgId: anonymousLabelMsgId },
                { name: survey.archived ? 'archived' : 'active', msgId: statusMsgId },
            ]

            if (!survey.archived) {
                infoListData.push({ name: 'link', href: linkUrl, target: '_blank', msgId: 'panes.survey.summary.viewLink' })
            }

            infoListData.push({ name: 'editLink', onClick: this.onEditSummaryClick.bind(this), msgId: 'panes.survey.summary.editLink' });

            return [
                <InfoList key="summary-infolist"
                    data={infoListData}
                />,
                <div key="content"
                    className="SurveyPane-content">
                    <Msg tagName="h3" id="panes.survey.content.h"/>
                    { contentBreakdown }
                    { !survey.archived ? 
                    <Button className="SurveyPane-contentEdit"
                        labelMsg="panes.survey.content.editLink"
                        onClick={ this.onEditContentClick.bind(this) }/> : null }
                </div>
            ];
        }
        else {
            return <LoadingIndicator/>;
        }
    }

    onEditSummaryClick(ev) {
        this.openPane('editsurvey', this.getParam(0));
    }

    onEditContentClick(ev) {
        this.openPane('surveyoutline', this.getParam(0));
    }
}
