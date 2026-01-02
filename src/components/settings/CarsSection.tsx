import React, { useState } from 'react';

import { tokens } from '@fluentui/react-components';

import { AddCarCard, CarCard, DeleteCarDialog } from '@/components/cars';
import { type Car, useCars } from '@/contexts';

type Props = {
  onCloseDialog?: () => void;
};

export const CarsSection: React.FC<Props> = ({ onCloseDialog }) => {
  const { cars, selectedCarId, setSelectedCarId, deleteCar } = useCars();

  const [carToDelete, setCarToDelete] = useState<Car | null>(null);

  const handleSelectCar = (car: Car) => {
    setSelectedCarId(car.id);
    onCloseDialog?.();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacingHorizontalL }}>
      {/* Car cards - one per line */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacingHorizontalM, paddingRight: tokens.spacingHorizontalM }}>
        {cars.map((car) => (
          <CarCard
            key={car.id}
            car={car}
            isSelected={selectedCarId === car.id}
            onSelect={() => handleSelectCar(car)}
            onDelete={() => setCarToDelete(car)}
          />
        ))}

        {/* Add car card - always visible at end of grid */}
        <AddCarCard />
      </div>

      {/* Delete confirmation dialog */}
      <DeleteCarDialog
        car={carToDelete}
        open={carToDelete !== null}
        onClose={() => setCarToDelete(null)}
        onConfirm={() => {
          if (carToDelete) {
            deleteCar(carToDelete.id);
            setCarToDelete(null);
          }
        }}
      />
    </div>
  );
};
