import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ApplicationShell } from '../components/layout/ApplicationShell';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Dialog } from '../components/common/Dialog';
import { workoutAPI } from '../services/api';
import type { Workout } from '../types';
import { format } from 'date-fns';
import { ChevronLeft, Trash2, Edit } from 'lucide-react';

export const WorkoutDetailPage = () => {
  const { workoutId } = useParams<{ workoutId: string }>();
  const navigate = useNavigate();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    const fetchWorkout = async () => {
      if (!workoutId) {
        setError('No workout ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await workoutAPI.getById(workoutId);
        setWorkout(response);
      } catch (err) {
        setError('Failed to load workout details');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    void fetchWorkout();
  }, [workoutId]);

  const handleDelete = async () => {
    if (!workout) {
      return;
    }

    try {
      setDeleting(true);
      await workoutAPI.delete(workout._id);
      setDeleteDialogOpen(false);
      navigate('/');
    } catch (err) {
      setError('Failed to delete workout');
      console.error(err);
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <ApplicationShell title="Workout">
        <div className="p-4 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-lg bg-navy-200 animate-pulse" />
          ))}
        </div>
      </ApplicationShell>
    );
  }

  if (error || !workout) {
    return (
      <ApplicationShell title="Workout">
        <div className="p-4">
          <Card>
            <div className="text-center py-8">
              <p className="mb-4 text-navy-700">{error || 'Workout not found'}</p>
              <Button onClick={() => navigate('/')} className="bg-navy-600 hover:bg-navy-700 text-white">
                Back to Dashboard
              </Button>
            </div>
          </Card>
        </div>
      </ApplicationShell>
    );
  }

  const workoutDate = new Date(workout.date_of_workout);

  return (
    <ApplicationShell title="Workout Details">
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={() => navigate('/')}
            className="rounded-lg p-2 transition hover:bg-navy-200"
          >
            <ChevronLeft className="h-5 w-5 text-navy-700" />
          </button>
          <h2 className="text-lg font-semibold text-navy-950">
            {format(workoutDate, 'MMMM d, yyyy')}
          </h2>
        </div>

        {/* Workout Summary */}
        <Card>
          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium text-navy-600 uppercase tracking-wide">Muscle Groups Trained</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {workout.target_muscle_groups && workout.target_muscle_groups.length > 0 ? (
                  workout.target_muscle_groups.map((muscle: string) => (
                    <Badge key={muscle} colour="primary" size="small">
                      {muscle}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-navy-700">No muscle groups recorded</p>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Exercises */}
        <div>
          <h3 className="text-sm font-semibold text-navy-900 mb-3 uppercase tracking-wide">Exercises Performed</h3>
          <div className="space-y-2">
            {workout.exercises && workout.exercises.length > 0 ? (
              workout.exercises.map((exercise, index: number) => (
                <Card key={index}>
                  <div className="space-y-2">
                    <p className="font-medium text-navy-950">{exercise.exercise_name}</p>
                    <div className="space-y-1">
                      {exercise.sets.map((set, setIndex: number) => (
                        <div key={setIndex} className="grid grid-cols-3 gap-2 rounded-xl bg-navy-200/70 p-2 text-sm">
                          <div>
                            <p className="text-xs text-navy-600">Reps</p>
                            <p className="font-semibold text-navy-950">{set.repetitions}</p>
                          </div>
                          <div>
                            <p className="text-xs text-navy-600">Weight</p>
                            <p className="font-semibold text-navy-950">{set.weight_in_kilograms} kg</p>
                          </div>
                          <div>
                            <p className="text-xs text-navy-600">RPE</p>
                            <p className="font-semibold text-navy-950">{set.rate_of_perceived_exertion}/10</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <p className="text-sm text-navy-700">No exercises recorded</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4">
          <Button
            onClick={() => navigate(`/workouts/${workout._id}/edit`)}
            className="flex-1 gap-2 bg-navy-600 hover:bg-navy-700 text-white"
          >
            <Edit className="w-4 h-4" />
            Edit
          </Button>
          <Button
            onClick={() => setDeleteDialogOpen(true)}
            disabled={deleting}
            className="flex-1 gap-2 bg-red-600 hover:bg-red-700 text-white"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </Button>
        </div>

        <Dialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          title="Delete workout"
          footer={(
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={() => setDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="danger" isLoading={deleting} onClick={handleDelete}>
                Delete workout
              </Button>
            </div>
          )}
        >
          <p className="text-sm text-navy-700">This will permanently remove this session and all sets.</p>
        </Dialog>
      </div>
    </ApplicationShell>
  );
};
