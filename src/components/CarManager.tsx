import React, { useState } from 'react';

import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  DialogTrigger,
  Text,
  tokens,
} from '@fluentui/react-components';
import {
  Add24Regular,
  Dismiss24Regular,
} from '@fluentui/react-icons';

import { AddCarForm, CarCard } from '@/components/cars';
import { SyncPanel } from '@/components/sync';
import type { Car, MergeResult } from '@/hooks';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cars: Car[];
  selectedCarId: string | null;
  onSelect: (car: Car) => void;
  onAdd: (car: Omit<Car, 'id'>) => void;
  onDelete: (id: string) => void;
  onMergeCars: (cars: Omit<Car, 'id'>[]) => MergeResult;
};

export const CarManager: React.FC<Props> = ({
  open,
  onOpenChange,
  cars,
  selectedCarId,
  onSelect,
  onAdd,
  onDelete,
  onMergeCars,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);

  const handleAdd = (car: Omit<Car, 'id'>) => {
    onAdd(car);
    setShowAddForm(false);
  };

  return (
    <Dialog open={open} onOpenChange={(_e, data) => onOpenChange(data.open)}>
      <DialogSurface style={{ maxWidth: 500 }}>
        <DialogBody>
          <DialogTitle
            action={
              <Button
                appearance="subtle"
                aria-label="Close"
                icon={<Dismiss24Regular />}
                onClick={() => onOpenChange(false)}
              />
            }
          >
            Manage Cars
          </DialogTitle>
          <DialogContent>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Car list */}
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {cars.length === 0 && !showAddForm && (
                  <div
                    style={{
                      padding: "24px 16px",
                      width: "100%",
                      textAlign: "center",
                      color: tokens.colorNeutralForeground3,
                    }}
                  >
                    <Text size={300}>No saved cars yet.</Text>
                  </div>
                )}
                {cars.map((car) => (
                  <CarCard
                    key={car.id}
                    car={car}
                    isSelected={selectedCarId === car.id}
                    onSelect={() => {
                      onSelect(car);
                      onOpenChange(false);
                    }}
                    onDelete={() => onDelete(car.id)}
                  />
                ))}
              </div>

              {/* Add car form */}
              {showAddForm ? (
                <AddCarForm
                  onAdd={handleAdd}
                  onCancel={() => setShowAddForm(false)}
                />
              ) : (
                <Button
                  appearance="subtle"
                  icon={<Add24Regular />}
                  onClick={() => setShowAddForm(true)}
                  style={{ alignSelf: "flex-start" }}
                >
                  Add Car
                </Button>
              )}

              {/* Sync panel */}
              <SyncPanel cars={cars} onImport={onMergeCars} />
            </div>
          </DialogContent>
          <DialogActions>
            <DialogTrigger disableButtonEnhancement>
              <Button appearance="secondary">Close</Button>
            </DialogTrigger>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
