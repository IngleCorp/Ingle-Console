import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TranasctionsComponent } from './tranasctions.component';

describe('TranasctionsComponent', () => {
  let component: TranasctionsComponent;
  let fixture: ComponentFixture<TranasctionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TranasctionsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TranasctionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
