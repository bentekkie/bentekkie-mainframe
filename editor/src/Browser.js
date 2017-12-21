import React, { Component } from 'react';
import FolderIcon from 'react-icons/lib/md/folder'
import OpenFolderIcon from 'react-icons/lib/md/folder-open'
import FileIcon from 'react-icons/lib/md/insert-drive-file'
import NewFolderIcon from 'react-icons/lib/md/create-new-folder'
import NewFileIcon from 'react-icons/lib/md/add-box'
import { ContextMenuProvider } from 'react-contexify';
import './Browser.css';




class Tdtext extends Component {

  render(){
    return (
    <div>{this.props.children}</div>
  )}
}

const Td = (props) => (
    <ContextMenuProvider id="menu_id" renderTag="td" className={props.cname} testProp={2}>
        <Tdtext {...props} >
        {props.content}
        </Tdtext>
    </ContextMenuProvider>
);

class Browser extends Component {
  render() {
    return (
      <div className="Browser">
      <table className="Browser_table">
        <tbody>
        {this.props.contents.folders.map(folder => (
            <tr  key={folder} onClick={() => {
              this.props.openFolder(this.props.current_dir+folder.split("/")[0])}
            }>
              <td className="Browser_icon">
              {(this.props.contents.selected_folder===folder.split("/")[0])?(<OpenFolderIcon/>):(<FolderIcon/>)}
              </td>
              <Td 
                  cname={(this.props.contents.selected_folder===folder.split("/")[0])?"Browser_row_selected_folder":"Browser_row"} 
                  content = {folder.split("/")[0]}
                  meta={{path:this.props.current_dir,name:folder.split("/")[0],type:"folder"}}
              />
            </tr>
            ))}
        {this.props.contents.files.map(file => (
            <tr key={file} onClick={() => this.props.openFile(this.props.current_dir+file.split("/")[0])}>
              <td className={(this.props.contents.selected_file===file.split("/")[0])?"Browser_icon_selected":"Browser_icon"}><FileIcon/></td>
              <Td 
                  cname={(this.props.contents.selected_file===file.split("/")[0])?"Browser_row_selected_file":"Browser_row"} 
                  content={file.split("/")[0]}
                  meta={{path:this.props.current_dir,name:file.split("/")[0],type:"file"}}
              />
            </tr>
        ))}
        <tr onClick={() => this.props.newFolder(this.props.current_dir)}>
            <td className="Browser_icon" ><NewFolderIcon/></td>
            <td className="Browser_row">New Folder...</td>
        </tr>
        <tr onClick={() => this.props.newFile(this.props.current_dir)}>
            <td className="Browser_icon"><NewFileIcon/></td>
            <td className="Browser_row">New File...</td>
        </tr>
        </tbody>
      </table>
      </div>
    );
  }
}

export default Browser;
