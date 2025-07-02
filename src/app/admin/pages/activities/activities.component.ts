import { Component, OnInit, OnDestroy } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-activities',
  templateUrl: './activities.component.html',
  styleUrls: ['./activities.component.scss']
})
export class ActivitiesComponent implements OnInit, OnDestroy {
  activities: any[] = [];
  isLoading = true;
  filterType: string = '';
  searchTerm: string = '';
  private activitiesSub?: Subscription;

  constructor(private afs: AngularFirestore) {}

  ngOnInit(): void {
    this.loadActivities();
  }

  ngOnDestroy(): void {
    this.activitiesSub?.unsubscribe();
  }

  loadActivities(): void {
    this.isLoading = true;
    this.activitiesSub = this.afs.collection('activities', ref => ref.orderBy('createdAt', 'desc'))
      .valueChanges({ idField: 'id' })
      .subscribe((activities: any[]) => {
        this.activities = activities;
        this.isLoading = false;
      });
  }

  get filteredActivities() {
    let filtered = this.activities;
    if (this.filterType) {
      filtered = filtered.filter(a => a.type === this.filterType);
    }
    if (this.searchTerm) {
      filtered = filtered.filter(a => a.details?.toLowerCase().includes(this.searchTerm.toLowerCase()) || a.entityName?.toLowerCase().includes(this.searchTerm.toLowerCase()));
    }
    return filtered;
  }
} 