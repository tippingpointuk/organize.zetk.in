import React from 'react';
import { connect } from 'react-redux';

import { flattenOrgs } from '../../../../utils/import';


@connect(state => ({ 
    subOrgs: state.subOrgs.items,
    activeOrg: state.user.activeMembership.organization,
}))
export default class PersonGenderColumnValue extends React.Component {

    constructor(props) {
        super(props);
        this.orgs = flattenOrgs(props.activeOrg, props.subOrgs);
    }

    render() {
        let value = this.props.value;
        let config = this.props.column.config;

        let mapping = config.mappings.find(m => m.value == value);

        let orgTitle;
        if(mapping && mapping.org && mapping.org != this.props.activeOrg.id) {
            orgTitle = this.orgs[mapping.org];
        } else {
            orgTitle = '';
        }

        return (
            <span>{ orgTitle }</span>
        );
    }
}
