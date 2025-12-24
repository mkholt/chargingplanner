import React, { useState } from 'react';

import {
  Button,
  Text,
  tokens,
} from '@fluentui/react-components';
import { Add24Regular } from '@fluentui/react-icons';

import { CarCard, CarForm, DeleteCarDialog } from '@/components/cars';
import type { Car } from '@/hooks';

type Props = {
  cars: Car[];
  selectedCarId: string | null;
  onSelect: (car: Car) => void;
  onAdd: (car: Omit<Car, 'id'>) => void;
  onUpdate: (id: string, updates: Partial<Omit<Car, 'id'>>) => void;
  onDelete: (id: string) => void;
  onCloseDialog?: () => void;
};

export const CarsSection: React.FC<Props> = ({
  cars,
  selectedCarId,
  onSelect,
  onAdd,
  onUpdate,
  onDelete,
  onCloseDialog,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCar, setEditingCar] = useState<Car | null>(null);
  const [carToDelete, setCarToDelete] = useState<Car | null>(null);

  const handleAdd = (car: Omit<Car, 'id'>) => {
    onAdd(car);
    setShowAddForm(false);
  };

  const handleEdit = (car: Omit<Car, 'id'>) => {
    if (editingCar) {
      onUpdate(editingCar.id, car);
      setEditingCar(null);
    }
  };

  const handleConfirmDelete = () => {
    if (carToDelete) {
      onDelete(carToDelete.id);
      setCarToDelete(null);
    }
  };

  const handleSelectCar = (car: Car) => {
    onSelect(car);
    onCloseDialog?.();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Car list */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {cars.length === 0 && !showAddForm && (
          <div
            style={{
              padding: '24px 16px',
              width: '100%',
              textAlign: 'center',
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
            onSelect={() => handleSelectCar(car)}
            onEdit={() => setEditingCar(car)}
            onDelete={() => setCarToDelete(car)}
          />
        ))}
      </div>

      {/* Edit car form */}
      {editingCar && (
        <CarForm
          car={editingCar}
          onSave={handleEdit}
          onCancel={() => setEditingCar(null)}
        />
      )}

      {/* Add car form */}
      {showAddForm && !editingCar ? (
        <CarForm
          onSave={handleAdd}
          onCancel={() => setShowAddForm(false)}
        />
      ) : !editingCar ? (
        <Button
          appearance="subtle"
          icon={<Add24Regular />}
          onClick={() => setShowAddForm(true)}
          style={{ alignSelf: 'flex-start' }}
        >
          Add Car
        </Button>
      ) : null}

      {/* Delete confirmation dialog */}
      <DeleteCarDialog
        car={carToDelete}
        open={carToDelete !== null}
        onClose={() => setCarToDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};
