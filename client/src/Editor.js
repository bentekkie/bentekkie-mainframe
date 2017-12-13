import React, { Component } from 'react';
import './Editor.css';
import Browser from './Browser'
import EditFile from './EditFile'
import { ContextMenu, Item} from 'react-contexify';
import 'react-contexify/dist/ReactContexify.min.css' 
import DeleteIcon from 'react-icons/lib/md/delete'
import Loadable from 'react-loading-overlay'

class Editor extends Component {
	constructor(props){
		super(props)
		this.state = {
			panels:[{dir: "/",files:[],folders:[]}],
			openedFilePath: "",
			openedFile: {content:" "},
			saving:false
		}
		this.socket = props.socket;
		this.openFile = this.openFile.bind(this)
		this.saveFile = this.saveFile.bind(this)
		this.openFolder = this.openFolder.bind(this)
		this.newFolder = this.newFolder.bind(this)
		this.newFile = this.newFile.bind(this)
		this.deleteItem = this.deleteItem.bind(this)
		this.socket.emit('get folder',"/")
	}
	componentDidMount() {
		const socket = this.socket
		socket.once('connect', () => {
			socket.on('send folder', (payload) => {
				if(payload.dir === "/"){
					this.setState({panels:[payload]})
				}else{
					this.setState((prevState) => {
						let regex = /(.*\/)[^/]*\//g
						let parent = regex.exec(payload.dir)
						let i = 0
						while(prevState.panels[i].dir !== parent[1]){
							i++
						}
						prevState.panels.length = i+1
						let splitArr = payload.dir.split("/")
						prevState.panels[i]['selected_folder'] = splitArr[splitArr.length-2]
						prevState.panels.push(payload)
						return {
							panels:prevState.panels
						}
					})
				}
			})
			socket.on('send file', (payload) =>{
				if(payload.file){
					this.setState((prevState) => {
						let parent = payload.dir.split("/").slice(0,-1).join("/")+"/"
						let i = 0
						while(prevState.panels[i].dir !== parent){
							i++
						}
						let splitArr = payload.dir.split("/")
						prevState.panels[i]['selected_file'] = splitArr[splitArr.length-1]
						return {
							openedFilePath:payload.dir,
							openedFile:payload.file,
							panels:prevState.panels
						}

					})
				}
			})
			socket.on('server error', err => {
				alert(err)
			})
			socket.on('save file done', status =>{
				this.setState({saving:false})
			})
			socket.on('change item done', parent =>{
				this.setState((prevState) => {
						let i = 0
						while(prevState.panels[i].dir !== parent.path){
							i++
						}

						prevState.panels[i].files = (parent.files)?parent.files:[]
						prevState.panels[i].folders = (parent.folders)?parent.folders:[]
						return {
							panels:prevState.panels
						}
					})
			})
		})
	}
	openFile(file){
		if(this.state.openedFilePath !== file){
			this.socket.emit('get file', file)
		}
	}
	openFolder(folder){
		this.socket.emit('get folder',folder+"/")
	}
	saveFile(content){

		this.socket.emit('save file',{path:this.state.openedFilePath,text:content})
		this.setState((prevState) =>({saving:true,openedFile: {...prevState,content:content}}))
	}
	newFolder(parent){
		let name = prompt("Enter folder name")
		if(name !== null && name !== ""){
			this.socket.emit('new item',{type:'folder',path:parent,name:name})
		}
	}
	newFile(parent){
		let name = prompt("Enter file name")
		if(name !== null && name !== ""){
			this.socket.emit('new item',{type:'file',path:parent,name:name})
		}

	}
	deleteItem(targetNode,ref,data){
			if(prompt("Enter name of "+ ref.props.meta.type + " " + ref.props.meta.name + " to delete") === ref.props.meta.name){
					this.socket.emit('delete item',ref.props.meta)
					let parent = ref.props.meta.path
					let type = ref.props.meta.type
					let name = ref.props.meta.name
					this.setState((prevState) => {
						let i = 0
						while(prevState.panels[i].dir !== parent){
							i++
						}
						if(type === "folder" && name === prevState.panels[i]['selected_folder']){
							prevState.panels.length = i+1
							prevState.panels[i]['selected_folder'] = ""
							return {
								panels:prevState.panels
							}
						}else if(type === "file" && name === prevState.panels[i]['selected_file']){
							prevState.panels[i]['selected_file'] = ""
							return {
								panels:prevState.panels,
								openedFilePath:"",
								openedFile:{content:" "}
							}
						}
						
					})
			}
	}
	render() {
		return (
			<div className = "Editor">
				<div className = "Editor_browser">
				{this.state.panels.map((contents) => (
					<Browser 
						key = {contents.dir}
						current_dir = {contents.dir} 
						contents = {contents}
						openFile = {this.openFile}
						openFolder = {this.openFolder}
						newFile = {this.newFile}
						newFolder = {this.newFolder}
					/>
					))}
				</div>
				<ContextMenu id='menu_id'>
						<Item leftIcon={<DeleteIcon/>} onClick={this.deleteItem}>
								Remove
						</Item>
				</ContextMenu>

				<div className = "Editor_editfile">
				<Loadable
					active={this.state.saving}
					spinner
					text='Saving...'
					>
					<div className = "Editor_editfile_inside">
					<EditFile 
						readOnly = {(this.state.openedFilePath === "")}
						content = {this.state.openedFile.content}
						onSave = {this.saveFile}
						spellCheck={true}
					/>
					</div>
				</Loadable>
				</div>
			</div>

		);
	}
}

export default Editor;
