import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BuscarRuta } from './buscar-ruta';

describe('BuscarRuta', () => {
  let component: BuscarRuta;
  let fixture: ComponentFixture<BuscarRuta>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BuscarRuta],
    }).compileComponents();

    fixture = TestBed.createComponent(BuscarRuta);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
