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
import { ChevronLeft, Repeat2, Trash2, Edit } from 'lucide-react';

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
      } catch {
        setError('Failed to load workout details');
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
    } catch {
      setError('Failed to delete workout');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <ApplicationShell title="Workout">
        <div className="p-4 space-y-4">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-24 rounded-lg bg-navy-200 animate-pulse" />
          ))}
        </div>
      </ApplicationShell>
    );
  }

  if (error || !workout) {
    return (
      <ApplicationShell title="Workout">
        <div className="p-4">
          <Card border>
            <div className="py-8 text-center">
              <p className="mb-4 text-navy-700">{error || 'Workout not found'}</p>
              <Button onClick={() => navigate('/')}>Back to Dashboard</Button>
            </div>
          </Card>
        </div>
      </ApplicationShell>
    );
  }

  const workoutDate = new Date(workout.date_of_workout);
  const totalSets = workout.exercises.reduce((sessionSets, exercise) => sessionSets + exercise.sets.length, 0);
  const totalVolume = workout.exercises.reduce(
    (sessionVolume, exercise) =>
      sessionVolume + exercise.sets.reduce((setVolume, set) => setVolume + set.weight_in_kilograms * set.repetitions, 0),
    0
  );

  return (
    <ApplicationShell title="Workout Details">
      <div className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <button
              onClick={() => navigate('/')}
              className="touch-target mb-2 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-navy-700 transition hover:bg-navy-200"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary-700">Session details</p>
            <h2 className="mt-1 font-display text-2xl font-semibold text-navy-950">
              {format(workoutDate, 'EEEE d MMMM')}
            </h2>
          </div>
          <Badge colour="primary" size="small">
            {format(workoutDate, 'HH:mm')}
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-navy-300/70 bg-navy-100/80 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-navy-600">Exercises</p>
            <p className="mt-1 font-display text-lg font-semibold text-navy-950">{workout.exercises.length}</p>
          </div>
          <div className="rounded-xl border border-primary-300/40 bg-primary-100/30 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary-700">Sets</p>
            <p className="mt-1 font-display text-lg font-semibold text-primary-900">{totalSets}</p>
          </div>
          <div className="rounded-xl border border-navy-300/70 bg-navy-100/80 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-navy-600">Volume</p>
            <p className="mt-1 font-display text-lg font-semibold text-navy-950">{Math.round(totalVolume)} kg</p>
          </div>
        </div>

        <Card border className="bg-navy-100/92">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-navy-600">Muscle groups</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {workout.target_muscle_groups.length > 0 ? (
              workout.target_muscle_groups.map((muscle) => (
                <Badge key={muscle} colour="primary" size="small">
                  {muscle}
                </Badge>
              ))
            ) : (
              <p className="text-sm text-navy-700">No muscle groups recorded</p>
            )}
          </div>
        </Card>

        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <h3 className="font-display text-xl font-semibold text-navy-900">Exercises</h3>
            <p className="text-sm text-navy-600">{workout.exercises.length} logged</p>
          </div>

          <div className="space-y-3">
            {workout.exercises.length > 0 ? (
              workout.exercises.map((exercise, index) => (
                <Card key={index} border className="bg-navy-100/95 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-display text-lg font-semibold text-navy-950">{exercise.exercise_name}</p>
                    <Badge colour="neutral" size="small">{exercise.sets.length} sets</Badge>
                  </div>

                  <div className="mt-3 overflow-hidden rounded-xl border border-navy-300/70">
                    <div className="grid grid-cols-4 bg-navy-200/70 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-navy-600">
                      <span>Set</span>
                      <span>Reps</span>
                      <span>Weight</span>
                      <span>RPE</span>
                    </div>
                    <div className="divide-y divide-navy-300/60 bg-navy-100/50">
                      {exercise.sets.map((set, setIndex) => (
                        <div key={setIndex} className="grid grid-cols-4 px-3 py-2 text-sm text-navy-900">
                          <span className="font-semibold">{setIndex + 1}</span>
                          <span>{set.repetitions}</span>
                          <span>{set.weight_in_kilograms} kg</span>
                          <span>{set.rate_of_perceived_exertion ?? '—'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <Card border>
                <p className="text-sm text-navy-700">No exercises recorded</p>
              </Card>
            )}
          </div>
        </section>

        <div className="sticky bottom-20 z-20 -mx-4 border-t border-navy-300/60 bg-navy-100/92 px-4 py-3 shadow-[0_-10px_26px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Button variant="outline" onClick={() => navigate(`/log?repeat=${workout._id}`)} className="gap-2">
              <Repeat2 className="h-4 w-4" />
              Repeat
            </Button>
            <Button onClick={() => navigate(`/workouts/${workout._id}/edit`)} className="gap-2">
              <Edit className="h-4 w-4" />
              Edit
            </Button>
            <Button onClick={() => setDeleteDialogOpen(true)} disabled={deleting} variant="danger" className="gap-2">
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
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
