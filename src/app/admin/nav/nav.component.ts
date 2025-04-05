import { BreakpointObserver } from '@angular/cdk/layout';
import {Component,ViewChild,OnInit} from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';
import { Router } from '@angular/router';
import { AngularFireAuth } from '@angular/fire/compat/auth';

@Component({
  selector: 'app-nav',
  templateUrl: './nav.component.html',
  styleUrl: './nav.component.scss'
})
export class NavComponent {

  title = 'material-responsive-sidenav';
  @ViewChild(MatSidenav)
  sidenav!: MatSidenav;
  isMobile= true;
  isCollapsed = true;
  universityMenuOpen = false;
  showSubmenu = false;
  showSubmenuIcon = false;
  constructor(private observer: BreakpointObserver, private router: Router, private auth: AngularFireAuth) {}

  ngOnInit() {
    this.observer.observe(['(max-width: 800px)']).subscribe((screenSize) => {
      if(screenSize.matches){
        this.isMobile = true;
      } else {
        this.isMobile = false;
      }
    });
  }

  toggleMenu() {
    if(this.isMobile){
      this.sidenav.toggle();
      this.isCollapsed = false;
    } else {
      
      this.sidenav.open();
      this.isCollapsed = !this.isCollapsed;
      if(this.isCollapsed){
        this.showSubmenuIcon=false;
        this.showSubmenu=false;
      }
      else{
        this.showSubmenuIcon=true;
       
      }
    }
  }

  async handleSignOut() {
    // console.log("logout");
    if(window.confirm("Are you sure you want to logout?")){
    try {
      const res = await this.signOut();
      this.router.navigateByUrl('/login');
    } catch (error) {
    }
  }
  }
  signOut(){
   
     this.router.navigateByUrl('/login');
  }

  
}