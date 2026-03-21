import { Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { PoModalAction, PoModalComponent } from '@po-ui/ng-components';

export type QueryOperationType = 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'DDL';

@Component({
  selector: 'app-confirm-dialog',
  templateUrl: './confirm-dialog.component.html',
  styleUrls: ['./confirm-dialog.component.css']
})
export class ConfirmDialogComponent {
  @ViewChild('confirmModal', { static: true }) modalRef!: PoModalComponent;

  @Input() queryType: string = '';
  @Input() targetDatabase: string = '';
  @Input() sqlPreview: string = '';
  @Input() set isOpen(value: boolean) {
    this._isOpen = value;
    if (this.modalRef) {
      if (value) {
        this.modalRef.open();
      } else {
        this.modalRef.close();
      }
    }
  }
  get isOpen(): boolean {
    return this._isOpen;
  }

  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  _isOpen = false;

  confirmAction: PoModalAction = {
    action: () => this.onConfirm(),
    label: 'Confirmar',
    danger: true
  };

  cancelAction: PoModalAction = {
    action: () => this.onCancel(),
    label: 'Cancelar'
  };

  onConfirm(): void {
    this.confirm.emit();
    this.closeModal();
  }

  onCancel(): void {
    this.cancel.emit();
    this.closeModal();
  }

  private closeModal(): void {
    this._isOpen = false;
    if (this.modalRef) {
      this.modalRef.close();
    }
  }
}
