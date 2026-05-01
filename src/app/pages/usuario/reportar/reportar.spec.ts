import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Reportar } from './reportar';

describe('Reportar', () => {
  let component: Reportar;
  let fixture: ComponentFixture<Reportar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Reportar],
    }).compileComponents();

    fixture = TestBed.createComponent(Reportar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
