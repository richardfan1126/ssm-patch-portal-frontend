import { Component, OnInit } from '@angular/core';
import { API, Auth } from 'aws-amplify';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  instances: any[] = [];
  scanStatus: any = {};
  isScanProcessing = true;

  refreshInstanceListLoading = false;
  startScanLoading = false;
  refreshScanStatusLoading = false;
  scanAssociationExist = true;

  scanStatusRefreshLoopHandle: NodeJS.Timeout | null = null;

  colCount = 5;

  constructor() { }

  ngOnInit(): void {
    this.refreshAll();
  }

  ngOnDestroy() {
      this._stopScanStatusRefreshLoop();
  }

  private _stopScanStatusRefreshLoop(){
    if(this.scanStatusRefreshLoopHandle){
      clearInterval(this.scanStatusRefreshLoopHandle);
      this.scanStatusRefreshLoopHandle = null;
    }
  }

  async refreshAll(){
    this.refreshInstanceList();
    this.refreshScanStatus();
  }

  async refreshInstanceList() {
    if(this.refreshInstanceListLoading){
      return;
    }
    
    this.instances = [];
    this.refreshInstanceListLoading = true;

    try{
      let response = await API.get('SsmPatchPortalAPI', '/instances', {});
      this.instances = response;
    } finally {
      this.refreshInstanceListLoading = false;
    }
  }

  async refreshScanStatus() {
    if(this.refreshScanStatusLoading){
      return;
    }

    this.scanStatus = {};
    this.refreshScanStatusLoading = true;
    this.isScanProcessing = true;
    this.scanAssociationExist = true;

    try{
      let response = await API.get('SsmPatchPortalAPI', '/association/scan', {});
      this.scanStatus = response;

      if(!this.scanStatus){
        this.scanAssociationExist = false;
      } else {
        if('overview' in this.scanStatus && 'Status' in this.scanStatus['overview']){
          if(this.scanStatus['overview']['Status'] == 'Pending'){
            this.isScanProcessing = true;
            
            // Setup loop to refresh the scan status
            if(!this.scanStatusRefreshLoopHandle){
              this.scanStatusRefreshLoopHandle = setInterval(this.refreshScanStatus.bind(this), 10000);
            }
          }else{
            this.isScanProcessing = false;

            // Refresh instance list after auto-refresh
            if(this.scanStatusRefreshLoopHandle){
              this.refreshInstanceList();
            }

            // Stop auto-refresh if applicable
            this._stopScanStatusRefreshLoop();
          }
        }
      }
    } finally {
      this.refreshScanStatusLoading = false;
    }
  }
  
  async startScan(){
    if(this.startScanLoading){
      return;
    }
    
    this.startScanLoading = true;

    try{
      let response = await API.post('SsmPatchPortalAPI', '/association/scan', {});
      this.refreshScanStatus();
    } finally {
      this.startScanLoading = false;
    }
  }

  async signOut() {
    try {
        await Auth.signOut();
    } catch (error) {
        console.log('error signing out: ', error);
    }
}

}
