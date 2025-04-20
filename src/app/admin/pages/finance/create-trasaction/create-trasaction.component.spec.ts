import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateTrasactionComponent } from './create-trasaction.component';

describe('CreateTrasactionComponent', () => {
  let component: CreateTrasactionComponent;
  let fixture: ComponentFixture<CreateTrasactionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CreateTrasactionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateTrasactionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
