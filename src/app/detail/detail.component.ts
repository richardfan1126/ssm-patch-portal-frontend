import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { API } from 'aws-amplify';

@Component({
  selector: 'app-detail',
  templateUrl: './detail.component.html',
  styleUrls: ['./detail.component.css']
})
export class DetailComponent implements OnInit {
  instanceId: string|null = "";
  instanceName = "";
  getPatchListLoading = false;
  patchList: any[] = [];
  selectedPatch: any[] = [];
  patchInProgress = true;

  isAllPatchSelected = true;
  selectedPatchCount = 0;
  selectedPatchNames = "";

  refreshLoopHandle: NodeJS.Timeout | null = null;

  @ViewChild('confirmDialog')confirmDialog: NgbModalRef | undefined;

  colCount = 6;

  constructor(
    private route: ActivatedRoute,
    private modalService: NgbModal
  ) {

  }

  ngOnInit(): void {
    const routeParams = this.route.snapshot.paramMap;
    this.instanceId = routeParams.get('instanceId');

    this.getPatchList();
  }

  ngOnDestroy() {
      this._stopsRefreshLoop();
  }

  private _stopsRefreshLoop(){
    if(this.refreshLoopHandle){
      clearInterval(this.refreshLoopHandle);
      this.refreshLoopHandle = null;
    }
  }

  async getPatchList(){
    if(this.getPatchListLoading){
      return;
    }
    
    this.patchList = [];
    this.getPatchListLoading = true;
    this.patchInProgress = true;

    try{
      let response = await API.get('SsmPatchPortalAPI', '/detail', {
        queryStringParameters: {
          'instance-id': this.instanceId
        }
      });
      this.patchList = response.missingPatches;
      this.instanceName = response.instanceName;
      this.patchInProgress = response.isPatching;

      // Setup loop to refresh the patch progress
      if(this.patchInProgress){
        if(!this.refreshLoopHandle){
          this.refreshLoopHandle = setInterval(this.getPatchList.bind(this), 10000);
        }
      } else {
        // Stop auto-refresh if applicable
        this._stopsRefreshLoop();
      }

      for(let patch of this.patchList){
        patch['selected'] = true;
      }
      this.checkIfAllPatchSelected();
    } finally {
      this.getPatchListLoading = false;
    }
  }

  async confirmInstall(){
    this.selectedPatch = [];
    let selectedPatchNames = '<ol class="fs-6">';

    for(let patch of this.patchList){
      if(patch['selected']){
        selectedPatchNames += "<li>" + patch['Title'] + "</li>";

        this.selectedPatch.push(patch);
      }
    }

    selectedPatchNames += '</ol>';

    this.selectedPatchNames = selectedPatchNames;
    let dialogResult = await this.modalService.open(this.confirmDialog, {
      size: "xl"
    }).result;

    if(dialogResult == 'Yes'){
      this.install();
    }
  }

  async install() {
    if(this.patchInProgress){
      return;
    }

    try{
      let response = await API.post('SsmPatchPortalAPI', '/patch', {
        body: {
            "instanceId": this.instanceId,
            "patches": this.selectedPatch
        }
      });
    } finally {
      this.getPatchList();
    }
  }

  toggleAll() {
    if(this.isAllPatchSelected){
      for(let patch of this.patchList){
        patch['selected'] = false;
      }
    }else{
      for(let patch of this.patchList){
        patch['selected'] = true;
      }
    }

    this.checkIfAllPatchSelected();
  }

  checkIfAllPatchSelected(){
    let isAllPatchSelected = true;
    let selectedPatchCount = 0;

    for(let patch of this.patchList){
      if(patch['selected']){
        selectedPatchCount++;
      } else {
        isAllPatchSelected = false;
      }
    }

    this.isAllPatchSelected = isAllPatchSelected;
    this.selectedPatchCount = selectedPatchCount;
  }
}
