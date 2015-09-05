import React from 'react/addons';


export default class Person extends React.Component {
    render() {
        const person = this.props.person;
        const fullName = (person.first_name && person.last_name)?
            person.first_name + ' ' + person.last_name :
            person.name? person.name : '';

        return (
            <span className="person" onClick={ this.props.onClick }>
                { fullName }
            </span>
        );
    }
}

Person.propTypes = {
    onClick: React.PropTypes.func,
    person: React.PropTypes.object.isRequired
};
