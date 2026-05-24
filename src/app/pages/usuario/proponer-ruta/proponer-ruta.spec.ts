import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProponerRuta } from './proponer-ruta';

describe('ProponerRuta', () => {
  let component: ProponerRuta;
  let fixture: ComponentFixture<ProponerRuta>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProponerRuta],
    }).compileComponents();

    fixture = TestBed.createComponent(ProponerRuta);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
