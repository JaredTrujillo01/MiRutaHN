import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NotasComunitarias } from './notas-comunitarias';

describe('NotasComunitarias', () => {
  let component: NotasComunitarias;
  let fixture: ComponentFixture<NotasComunitarias>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotasComunitarias],
    }).compileComponents();

    fixture = TestBed.createComponent(NotasComunitarias);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
