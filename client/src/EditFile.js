import React, { Component } from 'react';
import SaveIcon from 'react-icons/lib/md/save'
import './EditFile.css';
import RichTextEditor from 'react-rte';
import Button from 'react-rte/lib/ui/Button'



class EditFile extends Component {
  constructor(props){
    super(props)
    this.state = {
      value: RichTextEditor.createEmptyValue()
    }
    this.onChange = this.onChange.bind(this)
  }

  componentWillReceiveProps(nextProps) {
    this.setState((prevState) => ({
      value: prevState.value.setContentFromString(nextProps.content, 'html')
    }))
  }

  onChange(value){
    this.setState({value});
  };

  render () {
    return (
      <RichTextEditor
        readOnly={this.props.readOnly}
        value={this.state.value}
        onChange={this.onChange}
        customControls={[
        <Button key= {1}
          label="Remove Link"
          focusOnClick={false}
          onClick={() => this.props.onSave(this.state.value.toString('html'))}
        >
          <SaveIcon className="Editor_save"/>
        </Button>
        ]}
        />
    );
  }
}

export default EditFile;
