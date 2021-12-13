import React from 'react';
import { injectIntl, FormattedMessage as Msg } from 'react-intl';
import { connect } from 'react-redux';

import FilterBase from './FilterBase';
import Form from '../forms/Form';
import DateInput from '../forms/inputs/DateInput';
import IntInput from '../forms/inputs/IntInput';
import SelectInput from '../forms/inputs/SelectInput';
import RelSelectInput from '../forms/inputs/RelSelectInput';
import FilterOrganizationSelect from './FilterOrganizationSelect';
import filterByOrg from '../../utils/filterByOrg';
import { retrieveCallAssignments, retrieveCallAssignmentsRecursive } from '../../actions/callAssignment';
import { flattenOrganizationsFromState } from '../../utils/flattenOrganizations';


@connect(state => ({ 
    callAssignments: state.callAssignments,
    orgList: flattenOrganizationsFromState(state),
}))
@injectIntl
export default class CallHistoryFilter extends FilterBase {
    constructor(props) {
        super(props);

        this.state = stateFromConfig(props.config);
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.config !== this.props.config) {
            this.setState(stateFromConfig(nextProps.config));
        }
    }

    componentDidMount() {
        super.componentDidMount();

        let assignmentList = this.props.callAssignments.assignmentList;

        if (assignmentList.items.length == 0 && !assignmentList.isPending || !nextProps.callAssignments.assignmentList.recursive) {
            this.props.dispatch(retrieveCallAssignmentsRecursive());
        }
    }

    renderFilterForm(config) {
        let assignmentStore = this.props.callAssignments;
        let assignments = assignmentStore.assignmentList.items;
        assignments = filterByOrg(this.props.orgList, assignments, this.state).map(i => i.data);

        let timeframe = this.state.timeframe;
        let op = this.state.op;

        const msg = id => this.props.intl.formatMessage({ id });

        const OPERATOR_OPTIONS = {
            'called_spec': msg('filters.callHistory.opOptions.calledSpec'),
            'called_any': msg('filters.callHistory.opOptions.calledAny'),
            'reached_spec': msg('filters.callHistory.opOptions.reachedSpec'),
            'reached_any': msg('filters.callHistory.opOptions.reachedAny'),
            'notreached_spec': msg('filters.callHistory.opOptions.notReachedSpec'),
            'notreached_any': msg('filters.callHistory.opOptions.notReachedAny'),
        };

        const DATE_OPTIONS = {
            'any': msg('filters.callHistory.dateOptions.any'),
            'after': msg('filters.callHistory.dateOptions.after'),
            'before': msg('filters.callHistory.dateOptions.before'),
            'between': msg('filters.callHistory.dateOptions.between'),
            'inlast': msg('filters.callHistory.dateOptions.inLast'),
        };

        const minTimesOption = (this.state.minTimes > 1)? 'min' : 'any';
        const TIMES_OPTIONS = {
            'any': msg('filters.callHistory.timesOptions.any'),
            'min': msg('filters.callHistory.timesOptions.min'),
        };

        let assignmentSelect = null;
        if (op.indexOf('spec') > 0) {
            assignmentSelect = (
                <RelSelectInput key="assignment" name="assignment"
                    labelMsg="filters.callHistory.assignment"
                    objects={ assignments } value={ this.state.assignment }
                    onValueChange={ this.onChangeSimpleField.bind(this) }
                    showCreateOption={ false }/>
            );
        }

        let afterInput = null;
        if (timeframe == 'after' || timeframe == 'between') {
            afterInput = (
                <DateInput key="after" name="after"
                    className="CallHistoryFilter-after"
                    value={ this.state.after }
                    onValueChange={ this.onChangeSimpleField.bind(this) }/>
            );
        }

        let beforeInput = null;
        if (timeframe == 'before' || timeframe == 'between') {
            beforeInput = (
                <DateInput key="before" name="before"
                    className="CallHistoryFilter-before"
                    value={ this.state.before }
                    onValueChange={ this.onChangeSimpleField.bind(this) }/>
            );
        }

        let daysInput = null;
        if (timeframe == 'inlast') {
            daysInput = (
                <div className="CallHistoryFilter-days">
                    <IntInput key="days" name="days" value={ this.state.days }
                        onValueChange={ this.onChangeSimpleField.bind(this) }/>
                    <Msg tagName="label" id="filters.callHistory.labels.days"/>
                </div>
            );
        }

        let minTimesInput = null;
        if (minTimesOption == 'min') {
            minTimesInput = (
                <div className="CallHistoryFilter-minTimes">
                    <IntInput name="minTimes"
                        value={ this.state.minTimes }
                        onValueChange={ this.onChangeSimpleField.bind(this) }/>
                    <Msg tagName="label" id="filters.callHistory.labels.times"/>
                </div>
            );
        }

        return [
            <FilterOrganizationSelect
                    config={ config } 
                    openPane={ this.props.openPane }
                    onChangeOrganizations={ this.onChangeOrganizations.bind(this) }
                    />,

            <SelectInput key="operator" name="operator"
                label="Match people who have been"
                options={ OPERATOR_OPTIONS } value={ this.state.op }
                onValueChange={ this.onSelectOperator.bind(this) }/>,

            assignmentSelect,

            <SelectInput key="minTimesSelect" name="minTimesSelect"
                options={ TIMES_OPTIONS } value={ minTimesOption }
                onValueChange={ this.onSelectTimesOption.bind(this) }/>,

            minTimesInput,

            <SelectInput key="timeframe" name="timeframe"
                options={ DATE_OPTIONS } value={ this.state.timeframe }
                onValueChange={ this.onSelectTimeframe.bind(this) }/>,

            afterInput,
            beforeInput,
            daysInput,
        ];
    }

    getConfig() {
        let opFields = this.state.op.split('_');
        let before = this.state.before;
        let after = this.state.after;

        if (this.state.timeframe == 'inlast') {
            after = '-' + this.state.days + 'd';
            before = '+1d';
        }

        const cfg = {
            operator: opFields[0],
            assignment: (opFields[1] == 'spec')? this.state.assignment : null,
            before: before,
            after: after,
        };

        if (this.state.minTimes) {
            cfg.minTimes = parseInt(this.state.minTimes);
        }

        cfg.organizationOption = this.state.organizationOption;
        cfg.specificOrganizations = this.state.specificOrganizations;

        return cfg;
    }

    onChangeSimpleField(name, value) {
        let state = {};
        state[name] = value;
        this.setState(state, () => this.onConfigChange());
    }

    onSelectOperator(name, value) {
        const assignment = this.state.assignment;
        if (value.indexOf('any') > 0) {
            this.setState({ op: value, assignment: null }, () =>
                this.onConfigChange());
        }
        else if (assignment) {
            this.setState({ op: value, assignment: assignment }, () =>
                this.onConfigChange());
        }
        else {
            // Don't fire event for "spec" operators until an assignment
            // has actually been selected.
            this.setState({ op: value });
        }
    }

    onSelectTimesOption(name, value) {
        const minTimes = (value == 'any')? 0 : 2;
        this.setState({ minTimes }, () =>
            this.onConfigChange());
    }

    validDate(dateString) {
        return (new Date(dateString)).isValid();
    }

    onSelectTimeframe(name, value) {
        let before = undefined;
        let after = undefined;
        let days = undefined;
        let today = Date.create().format('{yyyy}-{MM}-{dd}');

        switch (value) {
            case 'after':
                if(this.state.after && this.validDate(this.state.after)) {
                    after = this.state.after;
                } else {
                    after = today;
                }
                break;
            case 'before':
                if(this.state.before && this.validDate(this.state.before)) {
                    before = this.state.before;
                } else {
                    before = today;
                }
                break;
            case 'inlast':
                days = 30;
                break;
            case 'between':
                if(this.state.after && this.validDate(this.state.after)) {
                    after = this.state.after;
                } else {
                    after = today;
                }
                if(this.state.before && this.validDate(this.state.before)) {
                    before = this.state.before;
                } else {
                    before = (new Date()).advance({ days: 30 }).format('{yyyy}-{MM}-{dd}');
                }
                break;
        }

        this.setState({ timeframe: value, before, after, days }, () =>
            this.onConfigChange());
    }

    onChangeOrganizations = (orgState) => {
        this.setState(orgState, () => this.onConfigChange());
    }
}

function stateFromConfig(config) {
    let opPrefix = config.operator || 'reached';
    let opSuffix = config.assignment? 'spec' : 'any';

    let state = {
        op: opPrefix + '_' + opSuffix,
        assignment: config.assignment,
        before: config.before,
        after: config.after,
        minTimes: config.minTimes,
    }

    state.timeframe = 'any';
    let match = /-([0-9]*)d/.exec(config.after);
    if(config.after && match) {
        state.timeframe = 'inlast';
        state.days = match[1];
    }
    else if (config.before && config.after) {
        state.timeframe = 'between';
    }
    else if (config.before) {
        state.timeframe = 'before';
    }
    else if (config.after) {
        state.timeframe = 'after';
    }

    state.organizationOption = config.organizationOption || 'all';
    state.specificOrganizations = config.specificOrganizations || [];

    return state;
}
