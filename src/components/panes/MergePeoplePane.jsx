import React from 'react';
import { injectIntl, FormattedMessage as Msg } from 'react-intl';
import cx from 'classnames';
import { connect } from 'react-redux';

import Button from '../misc/Button';
import PaneBase from './PaneBase';
import PersonCollection from '../misc/personcollection/PersonCollection';
import { PCDuplicateItem } from '../misc/personcollection/items';
import { retrieveFieldTypesForOrganization } from '../../actions/personField';
import {
    addDuplicatePerson,
    removeDuplicatePerson,
    mergeDuplicates,
} from '../../actions/person';


const mapStateToProps = (state, props) => {
    let duplicateItem = null;
    if (state.people.duplicateList && state.people.duplicateList.items) {
        duplicateItem = state.people.duplicateList.items
            .find(i => {
                return i.data.id == props.paneData.params[0];
            });
    }

    return {
        duplicateItem,
        fieldTypes: state.personFields.fieldTypes,
    }
};

const NATIVE_FIELDS = [
    'ext_id',
    'first_name',
    'last_name',
    'email',
    'phone',
    'co_address',
    'street_address',
    'zip_code',
    'city',
    'country',
];

const fieldsFromProps = props => {
    const fields = NATIVE_FIELDS.concat();

    if (props.fieldTypes && props.fieldTypes.items) {
        props.fieldTypes.items.forEach(item => {
            fields.push(item.data);
        });
    }

    return fields;
};

const stateFromProps = props => {
    let override = {};
    let objects = props.duplicateItem.data.objects.concat();

    objects.sort((o0, o1) => {
        if (o0.is_user && !o1.is_user) return -1;
        if (o1.is_user && !o0.is_user) return 1;
        return 0;
    });

    fieldsFromProps(props).forEach(field => {
        // Get unique non-null values
        let values = objects
            .map(o => o[field])
            .filter(val => !!val)
            .reverse()
            .filter((val, idx, arr) => arr.indexOf(val, idx+1) === -1)
            .reverse();

        if (values.length) {
            override[field] = values[0];
        }
    });

    return { override };
};

@injectIntl
@connect(mapStateToProps)
export default class MergePeoplePane extends PaneBase {
    constructor(props) {
        super(props);

        if (props.duplicateItem) {
            this.state = stateFromProps(props);
        }
    }

    getPaneTitle(data) {
        if (this.props.duplicateItem) {
            return this.props.intl.formatMessage(
                { id: 'panes.mergePeople.title' },
                { count: this.props.duplicateItem.data.objects.length });
        }
    }

    componentDidMount() {
        this.props.dispatch(retrieveFieldTypesForOrganization());
    }

    componentWillReceiveProps(nextProps) {
        if (!this.props.duplicateItem && nextProps.duplicateItem) {
            this.setState(stateFromProps(nextProps));
        }
    }

    renderPaneContent(data) {
        if (this.props.duplicateItem) {
            let canChange = false;
            let objects = this.props.duplicateItem.data.objects;

            let overrideItems = fieldsFromProps(this.props).map(field => {
                const fieldName = (typeof field === 'string')? field : field.slug;

                if (field.type && field.type == 'json') {
                    return null;
                }

                const values = objects
                    .map(o => o[fieldName])
                    .filter(val => !!val)
                    .map(val => val.trim? val.trim() : val)
                    .filter((val, idx, arr) => arr.lastIndexOf(val) === idx);

                let valueElem = null;

                if (values.length > 1) {
                    canChange = true;

                    let options = values.map(value => (
                        <option key={ value } value={ value }>{ value }</option>
                    ));

                    valueElem = (
                        <select key={ fieldName } value={ this.state.override[fieldName] }
                            onChange={ this.onOverrideChange.bind(this, fieldName) }>
                            { options }
                        </select>
                    );
                }
                else if (values.length == 1) {
                    valueElem = <span>{ values[0] }</span>;
                }
                else {
                    valueElem = <span>-</span>;
                }

                if (valueElem) {
                    let classes = cx('MergePeoplePane-fieldItem', {
                        multiple: values.length > 1,
                    });

                    let label = null;
                    if (typeof field === 'string') {
                        const msgId = 'panes.mergePeople.override.fields.' + field;
                        label = <Msg tagName="label" id={ msgId }/>;
                    }
                    else {
                        label = <label>{ field.title }</label>;
                    }

                    return (
                        <li key={ fieldName } className={ classes }>
                            { label }
                            { valueElem }
                        </li>
                    );
                }
            });

            let instructions = null;
            if (canChange) {
                instructions = (
                    <div className="MergePeoplePane-overrideInstructions">
                        <Msg tagName="small"
                            id="panes.mergePeople.override.instructions"/>
                    </div>
                );
            }

            return [
                <Msg key="intro" tagName="p" id="panes.mergePeople.intro"/>,
                <div key="objects">
                    <Msg tagName="h3" id="panes.mergePeople.objects.h"/>
                    <PersonCollection items={ objects }
                        itemComponent={ PCDuplicateItem }
                        showEditButtons={ false }
                        enableAdd={ true }
                        dispatch={ this.props.dispatch }
                        openPane={ this.openPane.bind(this) }
                        onRemove={ this.onRemoveDuplicate.bind(this) }
                        onAdd={ this.onAddDuplicate.bind(this) }
                        onSelect={ this.onSelectDuplicate.bind(this) }
                        />
                </div>,
                <div key="override" className="MergePeoplePane-override">
                    <Msg tagName="h3" id="panes.mergePeople.override.h"/>
                    <ul className="MergePeoplePane-overrideList">
                        { overrideItems }
                    </ul>
                    { instructions }
                </div>,
            ];
        }
    }

    renderPaneFooter(paneData) {
        return (
            <Button className="MergePeoplePane-execute"
                labelMsg="panes.mergePeople.execButton"
                onClick={ this.onClickExecute.bind(this) }
                />
        );
    }

    onClickExecute() {
        let objects = this.props.duplicateItem.data.objects.concat();
        let override = this.state.override;

        // Sort objects so that any who are connected to a user account
        // appear first. The master should be a user to not lose access.
        objects.sort((o0, o1) => {
            if (o0.is_user && !o1.is_user) return -1;
            if (o1.is_user && !o0.is_user) return 1;
            return 0;
        });

        let data = {
            id: this.props.duplicateItem.data.id,
            objects: objects.map(o => o.id),
        };

        this.props.dispatch(mergeDuplicates(data, override, this.props.paneData.id));
    }

    onRemoveDuplicate(person) {
        const id = this.props.duplicateItem.data.id;
        this.props.dispatch(removeDuplicatePerson(id, person));
    }

    onAddDuplicate(person) {
        const id = this.props.duplicateItem.data.id;
        this.props.dispatch(addDuplicatePerson(id, person));
    }

    onSelectDuplicate(person) {
        this.openPane('person', person.id);
    }

    onOverrideChange(field, ev) {
        this.setState({
            override: {
                ...this.state.override,
                [field]: ev.target.value,
            }
        });
    }
}
