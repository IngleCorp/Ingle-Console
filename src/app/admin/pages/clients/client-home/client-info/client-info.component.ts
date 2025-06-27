import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { ActivatedRoute } from '@angular/router';
import { GeneralService } from '../../../../../core/services/general.service';

@Component({
  selector: 'app-client-info',
  templateUrl: './client-info.component.html',
  styleUrls: ['./client-info.component.scss']
})
export class ClientInfoComponent implements OnInit {
  clientId: string | null = null;
  clientInfo: any;
  editmode: string = '';
  username: string = '';
  password: string = '';
  is_clientLoginExist: boolean = false;
  key: string = 'KKiHHHTsayys7sjlllss6789012kkkks3456';
  passwordKey: string = 'YiHHHvvvvYtyytghsbjysees7890jjj12kkkks3456';
  constructor(private afs: AngularFirestore, private route: ActivatedRoute, private service: GeneralService) { }

  ngOnInit(): void {
    this.clientId = this.route.parent?.snapshot.paramMap.get('id') ?? null;
    this.getClientInfo();
    this.getClientLoginInfo();
  }

  getClientInfo(): void {
    if (!this.clientId) return;
    this.afs.collection('clients').doc(this.clientId).valueChanges({ idField: 'id' }).subscribe((res: any) => {
      this.clientInfo = res;
    });
  }

  getClientLoginInfo(): void {
    if (!this.clientId) return;
    this.afs.collection('client-login').doc(this.clientId).valueChanges({ idField: 'id' }).subscribe((res: any) => {
      if (res) {
        let decrypted = this.decryptText(res.password, this.key);
        this.password = decrypted;
        this.username = res.userid;
        this.is_clientLoginExist = true;
      }
    });
  }

  updateClientInfo(): void {
    if (!this.clientId) return;
    this.afs.collection('clients').doc(this.clientId).update(this.clientInfo).then(() => {
      this.editmode = '';
    }).catch(err => {
      console.log(err);
    });
  }

  updateClientLoginInfo(): void {
    if (!this.clientId) return;
    let password = '';
    if (this.password) {
      password = this.encryptText(this.password, this.key);
    }
    let data = {
      userid: this.username,
      clientid: this.clientId,
      password: password
    };
    if (this.is_clientLoginExist) {
      this.afs.collection('client-login').doc(this.clientId).update(data).then(() => {
        this.editmode = '';
      }).catch(err => {
        console.log(err);
      });
    } else {
      this.afs.collection('client-login').doc(this.clientId).set(data).then(() => {
        this.editmode = '';
      }).catch(err => {
        console.error('Error adding document: ', err);
      });
    }
  }

  updateCLientCreatedAt(): void {
    if (!this.clientId) return;
    this.afs.collection('clients').doc(this.clientId).update({ createdAt: new Date() }).then(() => {
      this.editmode = '';
    }).catch(err => {
      console.log(err);
    });
  }

  decryptText(text: string, key: string): string {
    let result = '';
    for (let i = 0; i < text.length; i++) {
      let charCode = text.charCodeAt(i);
      let keyChar = key.charCodeAt(i % key.length);
      let decryptedChar = charCode ^ keyChar;
      result += String.fromCharCode(decryptedChar);
    }
    return result;
  }

  encryptText(text: string, key: string): string {
    let result = '';
    for (let i = 0; i < text.length; i++) {
      let charCode = text.charCodeAt(i);
      let keyChar = key.charCodeAt(i % key.length);
      let encryptedChar = charCode ^ keyChar;
      result += String.fromCharCode(encryptedChar);
    }
    return result;
  }

  uploadFile(event: any): void {
    // Uncomment and implement file upload logic if needed
    // const file = event.target.files[0];
    // this.service.uploadFile(event, 'test').then((res: any) => {
    //   this.clientInfo.image = res.url;
    //   this.updateClientInfo();
    // }).catch((err: any) => {
    //   console.log(err);
    // });
  }
}
