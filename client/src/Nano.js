import React,{ Component } from 'react';
import './Nano.css';
import EditFile from './EditFile';
import Loadable from 'react-loading-overlay'


class Nano extends Component {
	render() {
		return (
			<div className = "Nano_content">
                <Loadable
                        active={this.props.saving}
                        spinner
                        text="Saving..."
                        >
                    <div className = "Nano_contentInner">
                        <EditFile
                            content = {this.props.openedFile.content}
                            onSave = {this.props.saveFile}
                            onClose = {this.props.onClose}
                            spellCheck={true}
                        />
                    </div>
                </Loadable>
			</div>
		);
    }
}

export default Nano;
