import React, { useState } from 'react';

import { AddCarCard, CarCard, DeleteCarDialog } from '@/components/cars';
import { type Car, useCars } from '@/contexts';

type Props = {
  onCloseDialog?: () => void;
};

export const CarsSection: React.FC<Props> = ({ onCloseDialog }) => {
  const { cars, selectedCarId, setSelectedCarId, addCar, updateCar, deleteCar } = useCars();

  const [editingCarId, setEditingCarId] = useState<string | null>(null);
  const [isAddingCar, setIsAddingCar] = useState(false);
  const [carToDelete, setCarToDelete] = useState<Car | null>(null);

  const handleAdd = (car: Omit<Car, 'id'>) => {
    addCar(car);
    setIsAddingCar(false);
  };

  const handleSave = (carId: string, updates: Omit<Car, 'id'>) => {
    updateCar(carId, updates);
    setEditingCarId(null);
  };

  const handleConfirmDelete = () => {
    if (carToDelete) {
      deleteCar(carToDelete.id);
      setCarToDelete(null);
    }
  };

  const handleSelectCar = (car: Car) => {
    setSelectedCarId(car.id);
    onCloseDialog?.();
  };

  const handleStartEdit = (carId: string) => {
    setIsAddingCar(false);
    setEditingCarId(carId);
  };

  const handleStartAdd = () => {
    setEditingCarId(null);
    setIsAddingCar(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Car cards grid */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {cars.map((car) => (
          <CarCard
            key={car.id}
            car={car}
            isSelected={selectedCarId === car.id}
            isEditing={editingCarId === car.id}
            onSelect={() => handleSelectCar(car)}
            onEdit={() => handleStartEdit(car.id)}
            onSave={(updates) => handleSave(car.id, updates)}
            onCancelEdit={() => setEditingCarId(null)}
            onDelete={() => setCarToDelete(car)}
          />
        ))}

        {/* Add car card - always visible at end of grid */}
        <AddCarCard
          isAdding={isAddingCar}
          onStartAdd={handleStartAdd}
          onAdd={handleAdd}
          onCancel={() => setIsAddingCar(false)}
        />
      </div>

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
