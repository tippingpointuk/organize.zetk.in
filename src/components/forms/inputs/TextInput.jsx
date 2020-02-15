import React from 'react';
import { injectIntl } from 'react-intl';

import InputBase from './InputBase';

@injectIntl
export default class TextInput extends InputBase {

    constructor(props) {
        super(props);

        this.state = { isValid: false };
    }

    renderInput() {
        let placeholder;

        if (this.props.placeholder) {
            placeholder = this.props.intl.formatMessage(
                { id: this.props.placeholder });
        }

        return (
            <input type="text" ref="textinputfield" value={ this.props.value }
                {...this.props.constraints}
                placeholder={ placeholder }
                onChange={ this.onChange.bind(this) }/>
        );
    }

    onChange(ev) {
        super.onChange(ev);

        let v = this.refs.textinputfield.checkValidity();
        if (v !== this.state.isValid) {
            this.onValidityChange(v);
            this.state.isValid = v; // TODO: Can not SET PROPS???
        }
    }

    onValidityChange(newValidity) {
        if (this.props.onValidityChange) {
            this.props.onValidityChange(newValidity);
        }
    }
}
