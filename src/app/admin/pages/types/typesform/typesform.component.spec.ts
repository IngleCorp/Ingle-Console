import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TypesformComponent } from './typesform.component';

describe('TypesformComponent', () => {
  let component: TypesformComponent;
  let fixture: ComponentFixture<TypesformComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TypesformComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TypesformComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
