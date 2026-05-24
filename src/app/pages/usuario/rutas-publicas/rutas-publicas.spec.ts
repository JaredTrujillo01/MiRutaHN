import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RutasPublicas } from './rutas-publicas';

describe('RutasPublicas', () => {
  let component: RutasPublicas;
  let fixture: ComponentFixture<RutasPublicas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RutasPublicas],
    }).compileComponents();

    fixture = TestBed.createComponent(RutasPublicas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
